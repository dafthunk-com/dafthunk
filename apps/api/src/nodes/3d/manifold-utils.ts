import {
  Accessor,
  Buffer,
  Document,
  Material,
  NodeIO,
} from "@gltf-transform/core";
// @ts-ignore – manifold-3d has incomplete TypeScript types
import Module from "manifold-3d";

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
 * Initialize and return the Manifold WASM module
 * This should be called once per execution
 */
export async function initializeManifold() {
  try {
    const wasm = await Module();
    return wasm;
  } catch (error) {
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
