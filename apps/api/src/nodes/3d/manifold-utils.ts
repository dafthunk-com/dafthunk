import {
  Buffer,
  Document,
  Material,
  NodeIO,
} from "@gltf-transform/core";
// @ts-ignore – manifold-3d has incomplete TypeScript types
import Module from "manifold-3d";
// @ts-ignore – manifold-3d has incomplete TypeScript types
import wasmBinary from "manifold-3d/manifold.wasm";

/**
 * Represents a glTF document with metadata about the mesh
 */
export interface ManifoldGLTFResult {
  document: Document;
  stats: {
    vertexCount: number;
    triangleCount: number;
  };
}

/**
 * Cached Manifold module instance (singleton)
 */
let manifoldModule: any = null;

/**
 * Initialize and return the Manifold WASM module
 * This is cached so the module is only initialized once per worker lifecycle
 * Uses Emscripten's instantiateWasm pattern for Cloudflare Workers compatibility
 */
async function getManifold() {
  if (!manifoldModule) {
    console.log("[Manifold] Initializing Manifold WASM module...");
    console.log(
      "[Manifold] wasmBinary type:",
      typeof wasmBinary,
      "is WebAssembly.Module:",
      wasmBinary instanceof WebAssembly.Module
    );
    console.log("[Manifold] wasmBinary value:", wasmBinary);
    try {
      // Use instantiateWasm to provide a pre-compiled WebAssembly.Module
      // The wasmBinary here is a WebAssembly.Module (compiled by Wrangler)
      const moduleConfig: any = {
        instantiateWasm: (imports: any, successCallback: any) => {
          console.log("[Manifold] instantiateWasm callback invoked");
          try {
            // wasmBinary is a WebAssembly.Module, create an instance
            const wasmInstance = new WebAssembly.Instance(
              wasmBinary as WebAssembly.Module,
              imports
            );
            console.log("[Manifold] WASM instance created successfully");
            successCallback(wasmInstance);
            return {}; // Return empty object to indicate async instantiation
          } catch (error) {
            console.error("[Manifold] WASM instantiation failed:", error);
            throw error;
          }
        },
      };

      console.log("[Manifold] Calling Module() with instantiateWasm...");
      manifoldModule = await Module(moduleConfig);
      manifoldModule.setup();
      console.log("[Manifold] Module setup completed");
    } catch (error) {
      manifoldModule = null;
      throw new Error(
        `Failed to initialize Manifold module: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return manifoldModule;
}

/**
 * Create a cube using the direct Manifold API
 */
export async function createCube(
  size: number | [number, number, number],
  center: boolean = false
): Promise<ManifoldGLTFResult> {
  try {
    const wasm = await getManifold();

    // Parse size into [x, y, z]
    const [sizeX, sizeY, sizeZ] = Array.isArray(size)
      ? size
      : [size, size, size];

    console.log(
      `[Manifold] Creating cube with size [${sizeX}, ${sizeY}, ${sizeZ}], center=${center}`
    );

    // Create cube using direct Manifold API
    const cube = wasm.Manifold.cube([sizeX, sizeY, sizeZ], center);

    // Convert to glTF document
    const document = await manifoldMeshToGLTF(cube);

    // Extract and cleanup
    const stats = extractMeshStats(document);
    cube.delete(); // Critical: free WASM memory

    return {
      document,
      stats,
    };
  } catch (error) {
    console.error("[Manifold] Cube creation error:", error);
    throw new Error(
      `Failed to create cube: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Convert Manifold mesh to glTF document
 * The Manifold API returns a mesh with vertices and triangles
 */
async function manifoldMeshToGLTF(manifoldMesh: any): Promise<Document> {
  try {
    // Get the mesh data from Manifold
    const mesh = manifoldMesh.getMesh();
    if (!mesh) {
      throw new Error("Failed to extract mesh from Manifold geometry");
    }

    // Create glTF document and buffer
    const document = new Document();
    const buffer = document.createBuffer();

    // Extract vertex positions
    const vertPositions = mesh.vertPos;
    const positionsArray = new Float32Array(vertPositions.length * 3);

    // Populate position data
    let posIndex = 0;
    for (let i = 0; i < vertPositions.length; i++) {
      const v = vertPositions[i];
      positionsArray[posIndex++] = v.x;
      positionsArray[posIndex++] = v.y;
      positionsArray[posIndex++] = v.z;
    }

    // Create position accessor
    const positionAccessor = document
      .createAccessor()
      .setType("VEC3")
      .setArray(positionsArray)
      .setBuffer(buffer);

    // Extract triangle indices
    const indices = mesh.triVerts;
    const indicesArray = new Uint32Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
      indicesArray[i] = indices[i];
    }

    // Create index accessor
    const indexAccessor = document
      .createAccessor()
      .setType("SCALAR")
      .setArray(indicesArray)
      .setBuffer(buffer);

    // Create primitive with geometry
    const primitive = document
      .createPrimitive()
      .setAttribute("POSITION", positionAccessor)
      .setIndices(indexAccessor);

    // Create mesh and node
    const gltfMesh = document.createMesh().addPrimitive(primitive);
    const node = document.createNode().setMesh(gltfMesh);

    // Create or get default scene
    const scene = document.getRoot().getDefaultScene() || document.createScene();
    scene.addChild(node);

    return document;
  } catch (error) {
    throw new Error(
      `Failed to convert Manifold mesh to glTF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract vertex and triangle statistics from glTF document
 */
function extractMeshStats(document: Document): {
  vertexCount: number;
  triangleCount: number;
} {
  const scene = document.getRoot().getDefaultScene();
  if (!scene) {
    throw new Error("No default scene in glTF document");
  }

  // Count vertices and triangles from all meshes in the scene
  const meshes = scene.listChildren().filter((node) => node.getMesh());
  let vertexCount = 0;
  let triangleCount = 0;

  for (const node of meshes) {
    const mesh = node.getMesh();
    if (!mesh) continue;

    for (const primitive of mesh.listPrimitives()) {
      const positionAccessor = primitive.getAttribute("POSITION");
      if (positionAccessor) {
        vertexCount += positionAccessor.getCount();
      }

      const indices = primitive.getIndices();
      if (indices) {
        triangleCount += indices.getCount() / 3;
      }
    }
  }

  return { vertexCount, triangleCount };
}

/**
 * Convert glTF document to GLB binary format
 */
export async function glTFToGLB(
  document: Document,
  materialProperties?: {
    baseColorFactor?: readonly [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  }
): Promise<Uint8Array> {
  try {
    // Apply material properties to all primitives if provided
    if (materialProperties) {
      const scene = document.getRoot().getDefaultScene();
      if (scene) {
        const meshes = scene.listChildren().filter((node) => node.getMesh());
        for (const node of meshes) {
          const mesh = node.getMesh();
          if (mesh) {
            for (const primitive of mesh.listPrimitives()) {
              if (!primitive.getMaterial()) {
                const material = createPBRMaterial(document, materialProperties);
                primitive.setMaterial(material);
              }
            }
          }
        }
      }
    }

    // Export as GLB binary format
    const io = new NodeIO();
    return await io.writeBinary(document);
  } catch (error) {
    throw new Error(
      `Failed to convert glTF to GLB: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a PBR material with optional properties
 */
function createPBRMaterial(
  doc: Document,
  materialProperties: {
    baseColorFactor?: readonly [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  }
): Material {
  const baseColorFactor = materialProperties.baseColorFactor || [1.0, 1.0, 1.0, 1.0];
  const metallicFactor = materialProperties.metallicFactor ?? 0.0;
  const roughnessFactor = materialProperties.roughnessFactor ?? 0.8;

  return doc
    .createMaterial()
    .setBaseColorFactor([...baseColorFactor])
    .setMetallicFactor(metallicFactor)
    .setRoughnessFactor(roughnessFactor)
    .setDoubleSided(false);
}
