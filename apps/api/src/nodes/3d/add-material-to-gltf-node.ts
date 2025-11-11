import { NodeExecution, NodeType } from "@dafthunk/types";
import {
  Document,
  Material,
  NodeIO,
} from "@gltf-transform/core";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";

export class AddMaterialToGltfNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    gltf: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.literal("model/gltf-binary"),
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
      hasTexture: z.boolean(),
      materialType: z.literal("PBR"),
    }),
  });

  private static readonly DEFAULT_BASE_COLOR = [1.0, 1.0, 1.0, 1.0] as const;
  private static readonly DEFAULT_METALLIC_FACTOR = 0.0;
  private static readonly DEFAULT_ROUGHNESS_FACTOR = 0.8;

  public static readonly nodeType: NodeType = {
    id: "add-material-to-gltf",
    name: "Add Material to glTF",
    type: "add-material-to-gltf",
    description:
      "Add or update PBR material on glTF geometry with optional texture",
    tags: ["3D", "GLTF", "Material", "Texture"],
    icon: "palette",
    documentation:
      "Adds or replaces materials on glTF geometry. Supports PBR materials with optional textures and customizable metallic/roughness properties.",
    inlinable: false,
    inputs: [
      {
        name: "gltf",
        type: "gltf",
        description: "glTF geometry to apply material to",
        required: true,
      },
      {
        name: "texture",
        type: "image",
        description: "PNG texture image for surface",
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
        description: "glTF with applied material",
      },
      {
        name: "metadata",
        type: "json",
        description: "Material application statistics",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = AddMaterialToGltfNode.inputSchema.parse(
        context.inputs
      );
      const { gltf, texture, materialProperties } = validatedInput;

      const glbData = await this.addMaterialToGltf(
        gltf.data,
        texture?.data,
        materialProperties
      );

      const metadata = {
        fileSize: glbData.byteLength,
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
        `Add material to glTF failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async addMaterialToGltf(
    gltfData: Uint8Array,
    textureData?: Uint8Array,
    materialProperties?: {
      baseColorFactor?: readonly [number, number, number, number];
      metallicFactor?: number;
      roughnessFactor?: number;
    }
  ): Promise<Uint8Array> {
    const io = new NodeIO();
    const doc = await io.readBinary(gltfData);

    // Create material with properties
    const material = this.createMaterial(doc, textureData, materialProperties);

    // Apply material to all primitives in the document
    const root = doc.getRoot();
    for (const mesh of root.listMeshes()) {
      for (const primitive of mesh.listPrimitives()) {
        primitive.setMaterial(material);
      }
    }

    // Export as GLB binary format
    return await io.writeBinary(doc);
  }

  private createMaterial(
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
      AddMaterialToGltfNode.DEFAULT_BASE_COLOR;
    const metallicFactor =
      materialProperties?.metallicFactor ??
      AddMaterialToGltfNode.DEFAULT_METALLIC_FACTOR;
    const roughnessFactor =
      materialProperties?.roughnessFactor ??
      AddMaterialToGltfNode.DEFAULT_ROUGHNESS_FACTOR;

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
