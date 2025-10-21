import { NodeExecution, NodeType } from "@dafthunk/types";
import {
  Accessor,
  Buffer,
  Document,
  Material,
  NodeIO,
} from "@gltf-transform/core";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";

export class BufferGeometryToGltfNode extends ExecutableNode {
  private static readonly geometryDataShape = {
    positions: {} as Float32Array,
    indices: {} as Uint32Array,
    normals: {} as Float32Array,
    uvs: {} as Float32Array,
    vertexCount: 0 as number,
  };

  private static readonly inputSchema = z.object({
    bufferGeometry: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.literal("application/x-buffer-geometry"),
    }),
    texture: z
      .object({
        data: z.instanceof(Uint8Array),
        mimeType: z.literal("image/png"),
      })
      .optional(),
    materialProperties: z
      .object({
        baseColorFactor: z
          .tuple([z.number(), z.number(), z.number(), z.number()])
          .optional(),
        metallicFactor: z.number().min(0).max(1).optional(),
        roughnessFactor: z.number().min(0).max(1).optional(),
      })
      .optional(),
  });

  private static readonly outputSchema = z.object({
    gltf: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.literal("model/gltf-binary"),
    }),
    metadata: z.object({
      fileSize: z.number().positive(),
      vertexCount: z.number().nonnegative(),
      triangleCount: z.number().nonnegative(),
      hasTexture: z.boolean(),
      materialType: z.literal("PBR"),
    }),
  });

  private static readonly DEFAULT_BASE_COLOR = [1.0, 1.0, 1.0, 1.0] as const;
  private static readonly DEFAULT_METALLIC_FACTOR = 0.0;
  private static readonly DEFAULT_ROUGHNESS_FACTOR = 0.8;

  public static readonly nodeType: NodeType = {
    id: "buffergeometry-to-gltf",
    name: "BufferGeometry to glTF",
    type: "buffergeometry-to-gltf",
    description:
      "Convert 3D BufferGeometry and texture to GLB binary format for 3D Tiles",
    tags: ["3D", "BufferGeometry", "GLTF", "Convert"],
    icon: "box",
    documentation:
      "Converts BufferGeometry data with optional texture to glTF/GLB binary format optimized for 3D Tiles.",
    inlinable: false,
    inputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "BufferGeometry data from DEM-to-BufferGeometry node",
        required: true,
      },
      {
        name: "texture",
        type: "image",
        description: "PNG texture image for terrain surface",
        required: false,
      },
      {
        name: "materialProperties",
        type: "json",
        description: "PBR material configuration overrides",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "gltf",
        type: "gltf",
        description: "GLB binary data ready for 3D Tiles",
      },
      {
        name: "metadata",
        type: "json",
        description: "Export statistics and validation info",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = BufferGeometryToGltfNode.inputSchema.parse(
        context.inputs
      );
      const { bufferGeometry, texture, materialProperties } = validatedInput;

      const geometryData = this.extractBufferGeometry(bufferGeometry.data);
      const glbData = await this.createGltfDocument(
        geometryData,
        texture?.data,
        materialProperties
      );

      const metadata = {
        fileSize: glbData.byteLength,
        vertexCount: geometryData.vertexCount,
        triangleCount: geometryData.indices.length / 3,
        hasTexture: !!texture,
        materialType: "PBR" as const,
      };

      return this.createSuccessResult({
        gltf: {
          data: glbData,
          mimeType: "model/gltf-binary" as const,
        },
        metadata,
      });
    } catch (error) {
      return this.createErrorResult(
        `BufferGeometry to glTF conversion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private extractBufferGeometry(
    bufferData: Uint8Array
  ): typeof BufferGeometryToGltfNode.geometryDataShape {
    try {
      const view = new DataView(bufferData.buffer, bufferData.byteOffset);
      let offset = 0;

      // Read vertex count (first 4 bytes)
      const vertexCount = view.getUint32(offset, true);
      offset += 4;

      // Calculate component sizes based on vertex count
      const positionsSize = vertexCount * 3 * 4; // 3 components * 4 bytes per float
      const normalsSize = vertexCount * 3 * 4;
      const uvsSize = vertexCount * 2 * 4;

      // Calculate indices size from remaining buffer space
      const remainingSize =
        bufferData.byteLength - offset - positionsSize - normalsSize - uvsSize;
      const indicesSize = remainingSize;

      // Extract positions
      const positionsBuffer = bufferData.slice(offset, offset + positionsSize);
      const positions = new Float32Array(
        positionsBuffer.buffer,
        positionsBuffer.byteOffset,
        vertexCount * 3
      );
      offset += positionsSize;

      // Extract indices (Uint32Array format)
      const indicesCount = indicesSize / 4;
      const indicesBuffer = bufferData.slice(offset, offset + indicesSize);
      const indices = new Uint32Array(
        indicesBuffer.buffer,
        indicesBuffer.byteOffset,
        indicesCount
      );
      offset += indicesSize;

      // Extract normals
      const normalsBuffer = bufferData.slice(offset, offset + normalsSize);
      const normals = new Float32Array(
        normalsBuffer.buffer,
        normalsBuffer.byteOffset,
        vertexCount * 3
      );
      offset += normalsSize;

      // Extract UVs
      const uvsBuffer = bufferData.slice(offset, offset + uvsSize);
      const uvs = new Float32Array(
        uvsBuffer.buffer,
        uvsBuffer.byteOffset,
        vertexCount * 2
      );

      this.validateGeometry({ positions, indices, normals, uvs, vertexCount });

      return {
        positions,
        indices,
        normals,
        uvs,
        vertexCount,
      };
    } catch (error) {
      throw new Error(
        `Failed to extract BufferGeometry data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateGeometry(
    geometry: typeof BufferGeometryToGltfNode.geometryDataShape
  ): void {
    const { positions, indices, normals, uvs, vertexCount } = geometry;

    if (vertexCount <= 0) {
      throw new Error("Invalid vertex count: must be positive");
    }

    if (positions.length !== vertexCount * 3) {
      throw new Error(
        `Position array size mismatch: expected ${vertexCount * 3}, got ${positions.length}`
      );
    }

    if (normals.length !== vertexCount * 3) {
      throw new Error(
        `Normal array size mismatch: expected ${vertexCount * 3}, got ${normals.length}`
      );
    }

    if (uvs.length !== vertexCount * 2) {
      throw new Error(
        `UV array size mismatch: expected ${vertexCount * 2}, got ${uvs.length}`
      );
    }

    if (indices.length % 3 !== 0) {
      throw new Error("Index array length must be multiple of 3 (triangles)");
    }

    // Validate index bounds
    let maxIndex = 0;
    for (let i = 0; i < indices.length; i++) {
      if (indices[i] > maxIndex) {
        maxIndex = indices[i];
      }
    }
    if (maxIndex >= vertexCount) {
      throw new Error(`Index out of bounds: ${maxIndex} >= ${vertexCount}`);
    }
  }

  private async createGltfDocument(
    geometry: typeof BufferGeometryToGltfNode.geometryDataShape,
    textureData?: Uint8Array,
    materialProperties?: {
      baseColorFactor?: readonly [number, number, number, number];
      metallicFactor?: number;
      roughnessFactor?: number;
    }
  ): Promise<Uint8Array> {
    const doc = new Document();
    const buffer = doc.createBuffer();

    // Create accessors for geometry data
    const positionAccessor = this.createPositionAccessor(
      doc,
      buffer,
      geometry.positions
    );
    const normalAccessor = this.createNormalAccessor(
      doc,
      buffer,
      geometry.normals
    );
    const uvAccessor = this.createUvAccessor(doc, buffer, geometry.uvs);
    const indexAccessor = this.createIndexAccessor(
      doc,
      buffer,
      geometry.indices
    );

    // Create terrain-optimized material
    const material = this.createTerrainMaterial(
      doc,
      textureData,
      materialProperties
    );

    // Build mesh primitive
    const primitive = doc
      .createPrimitive()
      .setAttribute("POSITION", positionAccessor)
      .setAttribute("NORMAL", normalAccessor)
      .setAttribute("TEXCOORD_0", uvAccessor)
      .setIndices(indexAccessor)
      .setMaterial(material);

    // Create mesh and scene hierarchy
    const mesh = doc.createMesh().addPrimitive(primitive);
    const node = doc.createNode().setMesh(mesh);
    const scene = doc.getRoot().getDefaultScene() || doc.createScene();
    scene.addChild(node);

    // Export as GLB binary format
    const io = new NodeIO();
    return await io.writeBinary(doc);
  }

  private createPositionAccessor(
    doc: Document,
    buffer: Buffer,
    positions: Float32Array
  ): Accessor {
    return doc
      .createAccessor()
      .setType("VEC3")
      .setArray(positions)
      .setBuffer(buffer);
  }

  private createNormalAccessor(
    doc: Document,
    buffer: Buffer,
    normals: Float32Array
  ): Accessor {
    return doc
      .createAccessor()
      .setType("VEC3")
      .setArray(normals)
      .setBuffer(buffer);
  }

  private createUvAccessor(
    doc: Document,
    buffer: Buffer,
    uvs: Float32Array
  ): Accessor {
    return doc.createAccessor().setType("VEC2").setArray(uvs).setBuffer(buffer);
  }

  private createIndexAccessor(
    doc: Document,
    buffer: Buffer,
    indices: Uint32Array
  ): Accessor {
    return doc
      .createAccessor()
      .setType("SCALAR")
      .setArray(indices)
      .setBuffer(buffer);
  }

  private createTerrainMaterial(
    doc: Document,
    textureData?: Uint8Array,
    materialProperties?: {
      baseColorFactor?: readonly [number, number, number, number];
      metallicFactor?: number;
      roughnessFactor?: number;
    }
  ): Material {
    const baseColorFactor =
      materialProperties?.baseColorFactor ||
      BufferGeometryToGltfNode.DEFAULT_BASE_COLOR;
    const metallicFactor =
      materialProperties?.metallicFactor ??
      BufferGeometryToGltfNode.DEFAULT_METALLIC_FACTOR;
    const roughnessFactor =
      materialProperties?.roughnessFactor ??
      BufferGeometryToGltfNode.DEFAULT_ROUGHNESS_FACTOR;

    let material = doc
      .createMaterial()
      .setBaseColorFactor([...baseColorFactor])
      .setMetallicFactor(metallicFactor)
      .setRoughnessFactor(roughnessFactor)
      .setDoubleSided(false);

    // Add texture if provided
    if (textureData) {
      const texture = doc
        .createTexture()
        .setImage(textureData)
        .setMimeType("image/png");

      material = material.setBaseColorTexture(texture);
    }

    return material;
  }
}
