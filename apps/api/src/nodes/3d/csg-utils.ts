import {
  Buffer,
  Document,
  Material,
  NodeIO,
} from "@gltf-transform/core";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Uint32BufferAttribute,
} from "three";
import { Brush } from "three-bvh-csg";

/**
 * Represents a glTF document with metadata about the mesh
 */
export interface CSGGLTFResult {
  document: Document;
  stats: {
    vertexCount: number;
    triangleCount: number;
  };
}

/**
 * Convert Brush to glTF GLB binary format
 * Manually constructs glTF using @gltf-transform/core for Workers compatibility
 */
export async function brushToGLTF(
  brush: Brush,
  materialProperties?: {
    baseColorFactor?: readonly [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  }
): Promise<Uint8Array> {
  try {
    console.log("[CSG] Converting brush to glTF...");

    // Extract geometry from brush (Brush extends Mesh)
    const geometry = (brush as any).geometry as BufferGeometry;

    if (!geometry) {
      throw new Error("Brush has no geometry");
    }

    console.log(
      `[CSG] Brush geometry type: ${geometry?.constructor?.name}, has position: ${!!geometry?.getAttribute("position")}`
    );

    // Create glTF document and buffer
    const document = new Document();
    const buffer = document.createBuffer();

    // Extract and convert position data
    const positionAttr = geometry.getAttribute("position");
    console.log(`[CSG] Position attribute: ${positionAttr ? "found" : "missing"}`);

    if (!positionAttr) {
      throw new Error("Geometry has no position attribute");
    }

    console.log(`[CSG] Position attribute type: ${positionAttr?.constructor?.name}, has array: ${!!positionAttr?.array}, array type: ${positionAttr?.array?.constructor?.name}`);

    // Ensure position data exists - use safer access
    const posArray = positionAttr?.array;
    if (!posArray) {
      throw new Error(
        `Position attribute array is invalid - attribute exists but array is ${posArray ? "present" : "missing"}`
      );
    }

    const positions = new Float32Array(posArray);
    if (positions.length === 0) {
      throw new Error("Position array is empty");
    }

    const positionAccessor = document
      .createAccessor()
      .setType("VEC3")
      .setArray(positions)
      .setBuffer(buffer);

    // Create primitive with position
    const primitive = document
      .createPrimitive()
      .setAttribute("POSITION", positionAccessor);

    // Extract and convert index data if present
    const indexData = geometry.getIndex();
    if (indexData) {
      if (!indexData.array) {
        throw new Error(
          `Index data is invalid - indexData exists but array is ${indexData.array ? "present" : "missing"}`
        );
      }
      const indices = new Uint32Array(indexData.array);
      const indexAccessor = document
        .createAccessor()
        .setType("SCALAR")
        .setArray(indices)
        .setBuffer(buffer);
      primitive.setIndices(indexAccessor);
    }

    // Extract and convert normal data if present
    const normalAttr = geometry.getAttribute("normal");
    if (normalAttr) {
      if (!normalAttr.array) {
        console.warn("[CSG] Normal attribute exists but has no array data, skipping normals");
      } else {
        const normals = new Float32Array(normalAttr.array);
        const normalAccessor = document
          .createAccessor()
          .setType("VEC3")
          .setArray(normals)
          .setBuffer(buffer);
        primitive.setAttribute("NORMAL", normalAccessor);
      }
    }

    // Apply PBR material if provided
    if (materialProperties) {
      const material = createPBRMaterial(document, materialProperties);
      primitive.setMaterial(material);
    }

    // Create mesh, node, and scene
    const mesh = document.createMesh().addPrimitive(primitive);
    const node = document.createNode().setMesh(mesh);
    let scene = document.getRoot().getDefaultScene();
    if (!scene) {
      scene = document.createScene();
      document.getRoot().setDefaultScene(scene);
    }
    scene.addChild(node);

    // Export as GLB binary
    const io = new NodeIO();
    const glbData = await io.writeBinary(document);

    console.log("[CSG] glTF export completed");
    return glbData;
  } catch (error) {
    console.error("[CSG] Error converting brush to glTF:", error);
    if (error instanceof Error) {
      console.error("[CSG] Stack trace:", error.stack);
    }
    throw new Error(
      `Failed to convert brush to glTF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse glTF GLB binary data back to a Brush object
 * Uses @gltf-transform/core to parse the binary data and extract geometry
 */
export async function glTFToBrush(glbData: Uint8Array): Promise<Brush> {
  try {
    console.log("[CSG] Parsing glTF to brush...");

    // Read the binary glTF data
    const io = new NodeIO();
    const document = await io.readBinary(glbData);

    // Get the default scene
    const scene = document.getRoot().getDefaultScene();
    if (!scene) {
      throw new Error("No scene found in glTF document");
    }

    console.log("[CSG] Scene found, listing children...");

    // Find the first mesh in the scene
    const meshNodes = scene.listChildren().filter((node) => node.getMesh());
    if (meshNodes.length === 0) {
      throw new Error("No mesh found in scene");
    }

    console.log(`[CSG] Found ${meshNodes.length} mesh nodes`);

    const mesh = meshNodes[0].getMesh();
    if (!mesh) {
      throw new Error("Mesh is empty");
    }

    // Get the first primitive
    const primitives = mesh.listPrimitives();
    if (primitives.length === 0) {
      throw new Error("No primitives found in mesh");
    }

    console.log(`[CSG] Found ${primitives.length} primitives`);

    const primitive = primitives[0];

    // Create BufferGeometry from the primitive
    const geometry = new BufferGeometry();

    // Extract position attribute
    const positionAccessor = primitive.getAttribute("POSITION");
    if (!positionAccessor) {
      throw new Error("Position attribute not found");
    }

    let positions = positionAccessor.getArray();
    if (!positions) {
      throw new Error("Position data could not be extracted from accessor");
    }

    // Ensure positions is a proper Float32Array (make a copy if needed)
    if (!(positions instanceof Float32Array)) {
      console.log(`[CSG] Position array is ${positions?.constructor?.name}, converting to Float32Array`);
      positions = new Float32Array(positions as ArrayLike<number>);
    }

    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

    // Extract normal attribute if present
    const normalAccessor = primitive.getAttribute("NORMAL");
    if (normalAccessor) {
      let normals = normalAccessor.getArray();
      if (normals) {
        // Ensure normals is a proper Float32Array (make a copy if needed)
        if (!(normals instanceof Float32Array)) {
          console.log(`[CSG] Normal array is ${normals?.constructor?.name}, converting to Float32Array`);
          normals = new Float32Array(normals as ArrayLike<number>);
        }
        geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
      } else {
        console.warn("[CSG] Normal accessor found but getArray returned undefined, skipping normals");
      }
    }

    // Extract indices if present
    const indexAccessor = primitive.getIndices();
    if (indexAccessor) {
      let indices = indexAccessor.getArray();
      if (!indices) {
        throw new Error("Index data could not be extracted from accessor");
      }

      // Ensure indices is a proper Uint32Array (make a copy if needed)
      if (!(indices instanceof Uint32Array)) {
        console.log(`[CSG] Index array is ${indices?.constructor?.name}, converting to Uint32Array`);
        indices = new Uint32Array(indices as ArrayLike<number>);
      }

      geometry.setIndex(new Uint32BufferAttribute(indices, 1));
    }

    // Ensure the geometry has proper normals (required for CSG operations)
    console.log("[CSG] Checking/computing normals for parsed geometry...");
    if (!geometry.getAttribute("normal")) {
      console.log("[CSG] No normal attribute found, computing normals...");
      geometry.computeVertexNormals();
    } else {
      console.log("[CSG] Normal attribute exists, recomputing to ensure consistency...");
      // Recompute normals to ensure they're properly oriented
      geometry.computeVertexNormals();
    }

    // Delete any UV attributes that might cause issues
    if (geometry.hasAttribute("uv")) {
      console.log("[CSG] Removing UV attribute to prevent evaluator conflicts");
      geometry.deleteAttribute("uv");
    }

    // Create and return Brush
    const brush = new Brush(geometry);
    console.log("[CSG] Successfully parsed brush from glTF");
    return brush;
  } catch (error) {
    throw new Error(
      `Failed to parse glTF to brush: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract mesh statistics from a Brush
 */
export function extractBrushStats(brush: Brush): {
  vertexCount: number;
  triangleCount: number;
} {
  try {
    // Brush extends Mesh, so it has a geometry property
    const geometry = (brush as any).geometry as BufferGeometry;

    console.log(`[CSG] Extracting stats - brush type: ${brush?.constructor?.name}, geometry: ${geometry?.constructor?.name}`);

    if (!geometry) {
      console.warn("[CSG] No geometry found in brush");
      return { vertexCount: 0, triangleCount: 0 };
    }

    const positions = geometry.getAttribute("position");
    console.log(`[CSG] Positions attribute: ${positions ? "found" : "missing"}, type: ${positions?.constructor?.name}`);

    const vertexCount = positions && typeof positions.count === "number" ? positions.count : 0;

    // Count triangles from index or face count
    const index = geometry.getIndex();
    console.log(`[CSG] Index attribute: ${index ? "found" : "missing"}, type: ${index?.constructor?.name}`);

    let triangleCount = 0;

    if (index && typeof index.count === "number") {
      triangleCount = index.count / 3;
    } else if (positions && typeof positions.count === "number") {
      // No index buffer, assume each 3 vertices is a triangle
      triangleCount = positions.count / 3;
    }

    return { vertexCount, triangleCount };
  } catch (error) {
    console.error("[CSG] Error extracting brush stats:", error);
    if (error instanceof Error) {
      console.error("[CSG] Stack trace:", error.stack);
    }
    return { vertexCount: 0, triangleCount: 0 };
  }
}

/**
 * Extract vertex and triangle statistics from glTF document
 */
export function extractMeshStats(document: Document): {
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
 * Create a PBR material with optional properties
 * Using @gltf-transform/core for glTF-compatible material
 */
export function createPBRMaterial(
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


