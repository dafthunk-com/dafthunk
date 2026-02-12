import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { brushToGLTF, extractBrushStats, glTFToBrush } from "./csg-utils";

export class CgsApplyMaterialNode extends ExecutableNode {
  private static readonly applyMaterialInputSchema = z.object({
    mesh: z
      .union([
        z.instanceof(Uint8Array),
        z.object({
          data: z.instanceof(Uint8Array),
          mimeType: z.string().optional(),
        }),
      ])
      .describe("3D mesh to apply material to (GLB binary format)"),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex color (e.g., #FF0000)")
      .optional()
      .default("#808080")
      .describe("Base color as hex (e.g., #FF0000)"),
    metallic: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.0)
      .describe("Metallic factor (0 = non-metallic, 1 = metallic)"),
    roughness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.5)
      .describe("Roughness factor (0 = smooth/glossy, 1 = rough/matte)"),
  });

  public static readonly nodeType: NodeType = {
    id: "csg-apply-material",
    name: "Apply Material",
    type: "csg-apply-material",
    description: "Apply a PBR material to a 3D mesh",
    tags: ["3D", "Material", "PBR"],
    icon: "palette",
    documentation:
      "Applies PBR (Physically Based Rendering) material properties to a 3D mesh including color, metallic, and roughness.",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "mesh",
        type: "gltf",
        description: "3D mesh to apply material to (GLB format)",
        required: true,
      },
      {
        name: "color",
        type: "string",
        description: "Base color as hex (e.g., #FF0000)",
        value: "#808080",
      },
      {
        name: "metallic",
        type: "number",
        description: "Metallic factor (0-1)",
        value: 0.0,
      },
      {
        name: "roughness",
        type: "number",
        description: "Roughness factor (0-1)",
        value: 0.5,
      },
    ],
    outputs: [
      {
        name: "mesh",
        type: "gltf",
        description: "3D mesh with material applied (GLB format)",
      },
      {
        name: "metadata",
        type: "json",
        description: "Mesh metadata (vertex count, triangle count, material)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput =
        CgsApplyMaterialNode.applyMaterialInputSchema.parse(context.inputs);
      const { mesh: meshInput, color, metallic, roughness } = validatedInput;

      console.log(
        `[CgsApplyMaterialNode] Applying material: color=${color}, metallic=${metallic}, roughness=${roughness}`
      );

      // Extract GLB data from mesh input
      const meshData =
        meshInput instanceof Uint8Array ? meshInput : meshInput.data;

      // Parse GLB data back to brush
      const { brush } = await glTFToBrush(meshData);

      // Convert hex color to RGBA
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;

      const materialProperties = {
        baseColorFactor: [r, g, b, 1.0] as const,
        metallicFactor: metallic,
        roughnessFactor: roughness,
      };

      // Apply material to the brush
      const glbData = await brushToGLTF(brush, materialProperties);

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
          material: {
            color,
            metallic,
            roughness,
          },
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
        `Failed to apply material: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
