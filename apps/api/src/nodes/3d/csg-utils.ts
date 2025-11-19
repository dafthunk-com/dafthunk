import {
  Buffer,
  Document,
  Material,
  NodeIO,
} from "@gltf-transform/core";
import {
  BoxGeometry,
  BufferGeometry,
  Scene,
  SphereGeometry,
  CylinderGeometry,
  Group,
} from "three";
import { Brush, Evaluator } from "three-bvh-csg";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

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
 * Create a cube brush with specified dimensions
 */
export function createCubeBrush(
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  center: boolean = false
): Brush {
  console.log(
    `[CSG] Creating cube brush: [${sizeX}, ${sizeY}, ${sizeZ}], center=${center}`
  );

  const geometry = new BoxGeometry(sizeX, sizeY, sizeZ);
  const brush = new Brush(geometry);

  // Handle centering via position
  if (center) {
    brush.position.set(-sizeX / 2, -sizeY / 2, -sizeZ / 2);
  }

  return brush;
}

/**
 * Create a sphere brush with specified radius
 */
export function createSphereBrush(
  radius: number,
  widthSegments: number = 32,
  heightSegments: number = 32
): Brush {
  console.log(
    `[CSG] Creating sphere brush: radius=${radius}, segments=${widthSegments}x${heightSegments}`
  );

  const geometry = new SphereGeometry(radius, widthSegments, heightSegments);
  const brush = new Brush(geometry);

  return brush;
}

/**
 * Create a cylinder brush with specified dimensions
 */
export function createCylinderBrush(
  height: number,
  radiusBottom: number,
  radiusTop: number = radiusBottom,
  radialSegments: number = 32,
  center: boolean = false
): Brush {
  console.log(
    `[CSG] Creating cylinder brush: height=${height}, radiusBottom=${radiusBottom}, radiusTop=${radiusTop}`
  );

  const geometry = new CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    radialSegments
  );
  const brush = new Brush(geometry);

  // Handle centering
  if (center) {
    brush.position.y = -height / 2;
  }

  return brush;
}

/**
 * Convert Brush to glTF GLB binary format
 * Uses three.js GLTFExporter for native three.js geometry support
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

    // Create a scene with the brush
    const scene = new Scene();
    scene.add(brush);

    // Apply material if provided
    if (materialProperties && brush.material) {
      applyPBRMaterial(brush, materialProperties);
    }

    // Export to GLB using three.js GLTFExporter
    const exporter = new GLTFExporter();

    const glbData = await new Promise<Uint8Array>((resolve, reject) => {
      try {
        exporter.parse(
          scene,
          (result: ArrayBuffer | unknown) => {
            try {
              console.log("[CSG] glTF export completed");
              const buffer = result instanceof ArrayBuffer ? result : (result as ArrayBuffer);
              resolve(new Uint8Array(buffer));
            } catch (err) {
              reject(err);
            }
          },
          (error: Error | unknown) => {
            console.error("[CSG] glTF export error:", error);
            reject(error);
          },
          { binary: true }
        );
      } catch (err) {
        reject(err);
      }
    });

    return glbData;
  } catch (error) {
    throw new Error(
      `Failed to convert brush to glTF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse glTF GLB binary data back to a Brush object
 */
export async function glTFToBrush(glbData: Uint8Array): Promise<Brush> {
  try {
    console.log("[CSG] Parsing glTF to brush...");

    const loader = new GLTFLoader();

    // Parse the GLB data
    const gltf = await loader.parseAsync(glbData, "");

    // Extract geometry from first mesh in the scene
    if (!gltf.scene || gltf.scene.children.length === 0) {
      throw new Error("No geometry found in glTF file");
    }

    const mesh = gltf.scene.children[0];
    if (!mesh || !(mesh as any).geometry) {
      throw new Error("First child does not have geometry");
    }

    const geometry = (mesh as any).geometry as BufferGeometry;

    // Create and return a new Brush from the geometry
    const brush = new Brush(geometry);
    console.log("[CSG] glTF parsed to brush successfully");

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
  // Brush extends Mesh, so it has a geometry property
  const geometry = (brush as any).geometry as BufferGeometry;

  if (!geometry) {
    return { vertexCount: 0, triangleCount: 0 };
  }

  const positions = geometry.getAttribute("position");
  const vertexCount = positions ? positions.count : 0;

  // Count triangles from index or face count
  const index = geometry.getIndex();
  let triangleCount = 0;

  if (index) {
    triangleCount = index.count / 3;
  } else if (positions) {
    // No index buffer, assume each 3 vertices is a triangle
    triangleCount = positions.count / 3;
  }

  return { vertexCount, triangleCount };
}

/**
 * Apply PBR material properties to a Brush
 * Note: three.js Brush doesn't have built-in material support like Manifold
 * This is a placeholder for future enhancement
 */
function applyPBRMaterial(
  brush: Brush,
  materialProperties: {
    baseColorFactor?: readonly [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  }
): void {
  // TODO: Implement PBR material application to brush
  // This requires creating a three.js MeshStandardMaterial and applying it
  // For now, material is applied during GLTFExporter
  console.log("[CSG] PBR material properties received:", materialProperties);
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
