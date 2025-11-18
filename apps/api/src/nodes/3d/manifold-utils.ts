import {
  Accessor,
  Buffer,
  Document,
  Material,
  NodeIO,
} from "@gltf-transform/core";
// @ts-ignore – manifold-3d has incomplete TypeScript types
import { evaluate } from "manifold-3d/lib/worker.bundled.js";

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
 * Execute ManifoldCAD code and return the resulting glTF document
 * This uses the worker-specific API that's compatible with Cloudflare Workers
 */
export async function executeManifoldCode(
  code: string
): Promise<ManifoldGLTFResult> {
  try {
    console.log("[Manifold] Evaluating ManifoldCAD code...");

    // @ts-ignore – manifold-3d has incomplete TypeScript types
    const document = await evaluate(code);

    console.log("[Manifold] Code evaluation successful");

    // Extract mesh statistics from the glTF document
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

    return {
      document,
      stats: {
        vertexCount,
        triangleCount,
      },
    };
  } catch (error) {
    console.error("[Manifold] Code evaluation error:", error);
    throw new Error(
      `Failed to evaluate ManifoldCAD code: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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
