import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { brushToGLTF, extractBrushStats, glTFToBrush } from "./csg-utils";

export class CgsApplyTextureNode extends ExecutableNode {
  private static readonly applyTextureInputSchema = z.object({
    mesh: z
      .union([
        z.instanceof(Uint8Array),
        z.object({
          data: z.instanceof(Uint8Array),
          mimeType: z.string().optional(),
        }),
      ])
      .describe("3D mesh to apply texture to (GLB binary format)"),
    texture: z
      .object({
        data: z.instanceof(Uint8Array),
        mimeType: z.literal("image/png"),
      })
      .describe("PNG texture image to apply to the mesh"),
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
    id: "csg-apply-texture",
    name: "Apply Texture",
    type: "csg-apply-texture",
    description: "Apply a PNG texture to a 3D mesh",
    tags: ["3D", "Texture", "Material"],
    icon: "palette",
    documentation:
      "Applies a PNG texture to any 3D mesh. This is the single standard way to add textures to 3D geometry in the workflow.",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "mesh",
        type: "gltf",
        description: "3D mesh to apply texture to (GLB format)",
        required: true,
      },
      {
        name: "texture",
        type: "image",
        description: "PNG texture image to apply",
        required: true,
      },
      {
        name: "materialProperties",
        type: "json",
        description: "PBR material properties (baseColor, metallic, roughness)",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "mesh",
        type: "gltf",
        description: "3D mesh with texture applied (GLB format)",
      },
      {
        name: "metadata",
        type: "json",
        description:
          "Mesh metadata (vertex count, triangle count, texture info)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = CgsApplyTextureNode.applyTextureInputSchema.parse(
        context.inputs
      );
      const { mesh: meshInput, texture, materialProperties } = validatedInput;

      console.log("[CgsApplyTextureNode] Applying texture to mesh...");

      // Extract GLB data from mesh input (handle both raw Uint8Array and mesh object formats)
      const meshData =
        meshInput instanceof Uint8Array ? meshInput : meshInput.data;

      // Parse GLB data back to brush
      const { brush } = await glTFToBrush(meshData);

      console.log("[CgsApplyTextureNode] Parsed mesh, applying texture...");

      // Apply texture to the brush
      const glbData = await brushToGLTF(
        brush,
        materialProperties,
        texture.data
      );

      // Extract statistics from brush
      const stats = extractBrushStats(brush);

      return this.createSuccessResult({
        mesh: {
          data: glbData,
          mimeType: "model/gltf-binary" as const,
        },
        metadata: {
          vertexCount: stats.vertexCount,
          triangleCount: stats.triangleCount,
          textureApplied: true,
          textureSize: texture.data.length,
          hasMaterialProperties: !!materialProperties,
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
        `Failed to apply texture: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
