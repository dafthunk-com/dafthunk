import {
  Accessor,
  Buffer,
  Document,
  Material,
  NodeIO,
} from "@gltf-transform/core";

/**
 * Manifold mesh type - represented as a WASM object with geometry data
 */
export interface ManifoldMesh {
  numVert: number;
  numTri: number;
  getPositionArray: () => Float32Array;
  getTangentArray: () => Float32Array;
  getTriangleArray: () => Uint32Array;
  delete: () => void;
}

/**
 * Cache for the initialized Manifold instance and WASM binary
 */
let cachedWasmInstance: any = null;
let cachedWasmBinary: ArrayBuffer | null = null;

/**
 * Initialize and return the Manifold WASM module
 * This should be called once per execution.
 * Works in Cloudflare Workers by dynamically importing Module after setting
 * up the proper environment, preventing Node.js API usage during initialization.
 */
export async function initializeManifold() {
  try {
    console.log("[Manifold] === initializeManifold called ===");

    // Return cached instance if already initialized
    if (cachedWasmInstance) {
      console.log("[Manifold] Using cached instance");
      return cachedWasmInstance;
    }

    const wasmUrl = "https://unpkg.com/manifold-3d@3.3.2/manifold.wasm";
    console.log("[Manifold] Target WASM URL:", wasmUrl);

    // Fetch WASM binary only once
    if (!cachedWasmBinary) {
      console.log("[Manifold] Fetching WASM binary from CDN...");
      const response = await fetch(wasmUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch WASM from CDN: ${response.status} ${response.statusText}`
        );
      }
      cachedWasmBinary = await response.arrayBuffer();
      console.log(
        "[Manifold] WASM fetched successfully, size:",
        cachedWasmBinary.byteLength
      );
    } else {
      console.log("[Manifold] Using cached WASM binary");
    }

    // Save original globals to restore later
    console.log("[Manifold] Saving original globals...");
    const originalProcess = (globalThis as any).process;
    const originalRequire = (globalThis as any).require;
    console.log("[Manifold] Original process:", typeof originalProcess);
    console.log("[Manifold] Original require:", typeof originalRequire);

    try {
      // Prevent Manifold from trying to use Node.js APIs
      console.log("[Manifold] Deleting Node.js globals...");
      delete (globalThis as any).process;
      delete (globalThis as any).require;
      console.log("[Manifold] After delete - process:", typeof (globalThis as any).process);
      console.log("[Manifold] After delete - require:", typeof (globalThis as any).require);

      console.log("[Manifold] Dynamically importing manifold-3d module...");

      // Dynamically import Module only after environment is set up
      // @ts-ignore – manifold-3d has incomplete TypeScript types
      const { default: Module } = await import("manifold-3d");
      console.log("[Manifold] Module imported successfully, type:", typeof Module);

      console.log("[Manifold] Calling Module() with options...");
      console.log("[Manifold] - wasmBinary: ArrayBuffer of size", cachedWasmBinary.byteLength);
      console.log("[Manifold] - locateFile: callback function to resolve WASM URL");

      // Initialize Module with both wasmBinary and locateFile
      // The locateFile callback prevents URL parsing errors
      // @ts-ignore – manifold-3d has incomplete TypeScript types
      cachedWasmInstance = await Module({
        // @ts-ignore – wasmBinary is not in types but is supported by manifold-3d
        wasmBinary: cachedWasmBinary,
        // Provide locateFile to handle any file resolution attempts
        // This prevents the "Invalid URL string" error from findWasmBinary
        locateFile: (path: string, scriptDirectory: string) => {
          console.log("[Manifold] locateFile called:");
          console.log("[Manifold]   path:", path);
          console.log("[Manifold]   scriptDirectory:", scriptDirectory);

          // For the WASM file, return the CDN URL
          if (path.endsWith(".wasm") || path.includes("manifold.wasm")) {
            console.log("[Manifold]   returning WASM URL:", wasmUrl);
            return wasmUrl;
          }

          // For any other files, construct URL from unpkg
          const resolvedUrl = `https://unpkg.com/manifold-3d@3.3.2/${path}`;
          console.log("[Manifold]   returning resolved URL:", resolvedUrl);
          return resolvedUrl;
        },
      });

      console.log("[Manifold] Module() call completed successfully");
      console.log("[Manifold] cachedWasmInstance type:", typeof cachedWasmInstance);
      console.log("[Manifold] cachedWasmInstance.setup:", typeof cachedWasmInstance?.setup);

      // @ts-ignore – manifold-3d has incomplete TypeScript types
      if (!cachedWasmInstance || typeof cachedWasmInstance.setup !== "function") {
        console.error("[Manifold] ERROR: Invalid module instance");
        throw new Error("Module initialization failed - no setup function");
      }

      console.log("[Manifold] Calling setup()...");
      cachedWasmInstance.setup();
      console.log("[Manifold] === Successfully initialized ===");
    } finally {
      // Restore original globals
      console.log("[Manifold] Restoring original globals...");
      if (originalProcess) {
        (globalThis as any).process = originalProcess;
      } else {
        delete (globalThis as any).process;
      }
      if (originalRequire) {
        (globalThis as any).require = originalRequire;
      } else {
        delete (globalThis as any).require;
      }
      console.log("[Manifold] Globals restored");
    }

    return cachedWasmInstance;
  } catch (error) {
    console.error("[Manifold] ========================================");
    console.error("[Manifold] INITIALIZATION ERROR");
    console.error("[Manifold] ========================================");
    console.error("[Manifold] Error object:", error);
    if (error instanceof Error) {
      console.error("[Manifold] Error name:", error.name);
      console.error("[Manifold] Error message:", error.message);
      console.error("[Manifold] Error stack:", error.stack);
    }
    console.error("[Manifold] ========================================");
    throw new Error(
      `Failed to initialize Manifold library: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Convert Manifold mesh to glTF document (GLB format)
 * Used by all nodes that need to export geometry
 */
export async function manifoldToGLTF(
  mesh: ManifoldMesh,
  materialProperties?: {
    baseColorFactor?: readonly [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  }
): Promise<Uint8Array> {
  try {
    // Extract geometry data from Manifold mesh
    const positions = mesh.getPositionArray();
    const triangles = mesh.getTriangleArray();

    if (positions.length === 0 || triangles.length === 0) {
      throw new Error("Mesh has no geometry data");
    }

    // Compute normals from positions and indices
    const normals = computeNormals(positions, triangles);

    // Create glTF document
    const doc = new Document();
    const buffer = doc.createBuffer();

    // Create accessors for geometry data
    const positionAccessor = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(positions)
      .setBuffer(buffer);

    const normalAccessor = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(normals)
      .setBuffer(buffer);

    const indexAccessor = doc
      .createAccessor()
      .setType("SCALAR")
      .setArray(triangles)
      .setBuffer(buffer);

    // Build mesh primitive
    const primitive = doc
      .createPrimitive()
      .setAttribute("POSITION", positionAccessor)
      .setAttribute("NORMAL", normalAccessor)
      .setIndices(indexAccessor);

    // Apply material properties if provided
    if (materialProperties) {
      const material = createPBRMaterial(doc, materialProperties);
      primitive.setMaterial(material);
    }

    // Create mesh and scene hierarchy
    const meshObj = doc.createMesh().addPrimitive(primitive);
    const node = doc.createNode().setMesh(meshObj);
    const scene = doc.getRoot().getDefaultScene() || doc.createScene();
    scene.addChild(node);

    // Export as GLB binary format
    const io = new NodeIO();
    return await io.writeBinary(doc);
  } catch (error) {
    throw new Error(
      `Failed to convert mesh to glTF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Compute vertex normals from positions and triangle indices
 */
function computeNormals(
  positions: Float32Array,
  indices: Uint32Array
): Float32Array {
  const normals = new Float32Array(positions.length);

  // Accumulate face normals for each vertex
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;

    // Get vertices
    const ax = positions[a],
      ay = positions[a + 1],
      az = positions[a + 2];
    const bx = positions[b],
      by = positions[b + 1],
      bz = positions[b + 2];
    const cx = positions[c],
      cy = positions[c + 1],
      cz = positions[c + 2];

    // Compute face normal using cross product
    const abx = bx - ax,
      aby = by - ay,
      abz = bz - az;
    const acx = cx - ax,
      acy = cy - ay,
      acz = cz - az;

    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    // Add face normal to each vertex
    normals[a] += nx;
    normals[a + 1] += ny;
    normals[a + 2] += nz;
    normals[b] += nx;
    normals[b + 1] += ny;
    normals[b + 2] += nz;
    normals[c] += nx;
    normals[c + 1] += ny;
    normals[c + 2] += nz;
  }

  // Normalize all vertex normals
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i];
    const ny = normals[i + 1];
    const nz = normals[i + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    normals[i] = nx / len;
    normals[i + 1] = ny / len;
    normals[i + 2] = nz / len;
  }

  return normals;
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

/**
 * Clean up WASM memory for a mesh
 * IMPORTANT: Must be called when done with a mesh to avoid memory leaks
 */
export function cleanupMesh(mesh: ManifoldMesh): void {
  try {
    if (mesh && typeof mesh.delete === "function") {
      mesh.delete();
    }
  } catch (error) {
    console.warn(
      `Failed to cleanup mesh: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get mesh statistics (vertex and triangle counts)
 */
export function getMeshStats(mesh: ManifoldMesh): {
  vertexCount: number;
  triangleCount: number;
} {
  return {
    vertexCount: mesh.numVert,
    triangleCount: mesh.numTri,
  };
}
