import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { brushToGLTF, extractBrushStats, glTFToBrush } from "./csg-utils";

export class CgsTranslateNode extends ExecutableNode {
  private static readonly translateInputSchema = z.object({
    mesh: z
      .union([
        z.instanceof(Uint8Array),
        z.object({
          data: z.instanceof(Uint8Array),
          mimeType: z.string().optional(),
        }),
      ])
      .describe("Input mesh (GLB binary format)"),
    offset: z
      .tuple([z.number(), z.number(), z.number()])
      .describe("Translation offset [x, y, z]"),
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

  public static readonly nodeType: NodeType = {
    id: "csg-translate",
    name: "CSG Translate",
    type: "csg-translate",
    description: "Translate (move) a 3D mesh in space",
    tags: ["3D", "CSG", "Transform"],
    icon: "move",
    documentation:
      "Translates a 3D mesh by the specified offset vector [x, y, z]. Does not modify the original mesh.",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "mesh",
        type: "gltf",
        description: "Input 3D mesh (GLB format)",
        required: true,
      },
      {
        name: "offset",
        type: "json",
        description: "Translation offset as [x, y, z]",
        required: true,
      },
      {
        name: "materialProperties",
        type: "json",
        description: "PBR material configuration (optional)",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "mesh",
        type: "gltf",
        description: "Translated mesh (GLB format)",
      },
      {
        name: "metadata",
        type: "json",
        description: "Mesh metadata (vertex count, triangle count, offset)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = CgsTranslateNode.translateInputSchema.parse(
        context.inputs
      );
      const { mesh, offset, materialProperties } = validatedInput;

      console.log(
        `[CgsTranslateNode] Translating mesh by [${offset[0]}, ${offset[1]}, ${offset[2]}]`
      );

      const meshData = mesh instanceof Uint8Array ? mesh : mesh.data;
      const { brush, materialData } = await glTFToBrush(meshData);

      brush.position.set(offset[0], offset[1], offset[2]);
      brush.updateMatrixWorld();

      // Preserve texture and material from input, but allow override with materialProperties
      // When texture exists and no explicit material override, use defaults to avoid tinting
      let finalMaterialProps = materialProperties;
      if (!materialProperties && materialData.textureData) {
        // When preserving texture without explicit material props, use neutral values
        finalMaterialProps = undefined; // Let createPBRMaterial use defaults
      } else if (!materialProperties) {
        // No texture, preserve original material properties
        finalMaterialProps = materialData.materialProperties;
      }
      const finalTexture = materialData.textureData;

      const glbData = await brushToGLTF(
        brush,
        finalMaterialProps,
        finalTexture
      );
      const stats = extractBrushStats(brush);

      return this.createSuccessResult({
        mesh: {
          data: glbData,
          mimeType: "model/gltf-binary" as const,
        },
        metadata: {
          vertexCount: stats.vertexCount,
          triangleCount: stats.triangleCount,
          offset,
          hasTexture: !!finalTexture,
          hasMaterial: !!(finalMaterialProps || finalTexture),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        return this.createErrorResult(`Validation error: ${errorMessages}`);
      }

      return this.createErrorResult(
        `Translation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
