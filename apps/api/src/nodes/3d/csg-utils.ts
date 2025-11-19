import {
  Buffer,
  Document,
  Material,
  NodeIO,
} from "@gltf-transform/core";
import {
  BoxGeometry,
  BufferGeometry,
  SphereGeometry,
  CylinderGeometry,
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

    // Create glTF document and buffer
    const document = new Document();
    const buffer = document.createBuffer();

    // Extract and convert position data
    const positionAttr = geometry.getAttribute("position");
    if (!positionAttr) {
      throw new Error("Geometry has no position attribute");
    }

    const positions = new Float32Array(positionAttr.array as ArrayBuffer);
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
      const indices = new Uint32Array(indexData.array as ArrayBuffer);
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
      const normals = new Float32Array(normalAttr.array as ArrayBuffer);
      const normalAccessor = document
        .createAccessor()
        .setType("VEC3")
        .setArray(normals)
        .setBuffer(buffer);
      primitive.setAttribute("NORMAL", normalAccessor);
    }

    // Apply PBR material if provided
    if (materialProperties) {
      const material = createPBRMaterial(document, materialProperties);
      primitive.setMaterial(material);
    }

    // Create mesh, node, and scene
    const mesh = document.createMesh().addPrimitive(primitive);
    const node = document.createNode().setMesh(mesh);
    const scene = document.getRoot().getDefaultScene() || document.createScene();
    scene.addChild(node);

    // Export as GLB binary
    const io = new NodeIO();
    const glbData = await io.writeBinary(document);

    console.log("[CSG] glTF export completed");
    return glbData;
  } catch (error) {
    throw new Error(
      `Failed to convert brush to glTF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parse glTF GLB binary data back to a Brush object
 * NOTE: This requires a Workers-compatible glTF parser.
 * For MVP, CSG operations will use Brush.evaluate() with already-parsed brushes.
 * This is a placeholder for future implementation.
 */
export async function glTFToBrush(glbData: Uint8Array): Promise<Brush> {
  try {
    console.log("[CSG] Parsing glTF to brush...");

    // TODO: Implement glTF parsing using @gltf-transform/core
    // For now, throw a helpful error
    throw new Error(
      "glTFToBrush not yet implemented. Use brush creation functions (createCubeBrush, etc.) instead."
    );
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
