import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { brushToGLTF, extractBrushStats, glTFToBrush } from "./csg-utils";

export class CgsScaleNode extends ExecutableNode {
  private static readonly scaleInputSchema = z.object({
    mesh: z
      .union([
        z.instanceof(Uint8Array),
        z.object({
          data: z.instanceof(Uint8Array),
          mimeType: z.string().optional(),
        }),
      ])
      .describe("Input mesh (GLB binary format)"),
    scale: z
      .union([
        z.number().positive("Scale must be positive"),
        z
          .tuple([
            z.number().positive("X scale must be positive"),
            z.number().positive("Y scale must be positive"),
            z.number().positive("Z scale must be positive"),
          ])
          .describe("Scale as [x, y, z]"),
      ])
      .describe("Scale factor (single number or [x, y, z])"),
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
    id: "csg-scale",
    name: "CSG Scale",
    type: "csg-scale",
    description: "Scale a 3D mesh uniformly or per-axis",
    tags: ["3D", "CSG", "Transform"],
    icon: "maximize",
    documentation:
      "Scales a 3D mesh by the specified factor. Can be a single number for uniform scaling or [x, y, z] for per-axis scaling.",
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
        name: "scale",
        type: "json",
        description: "Scale factor: single number or [x, y, z]",
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
        description: "Scaled mesh (GLB format)",
      },
      {
        name: "metadata",
        type: "json",
        description: "Mesh metadata (vertex count, triangle count, scale)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = CgsScaleNode.scaleInputSchema.parse(
        context.inputs
      );
      const { mesh, scale, materialProperties } = validatedInput;

      const [scaleX, scaleY, scaleZ] = Array.isArray(scale)
        ? scale
        : [scale, scale, scale];

      console.log(
        `[CgsScaleNode] Scaling mesh by [${scaleX}, ${scaleY}, ${scaleZ}]`
      );

      const meshData = mesh instanceof Uint8Array ? mesh : mesh.data;
      const { brush, materialData } = await glTFToBrush(meshData);

      brush.scale.set(scaleX, scaleY, scaleZ);
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
          scale: [scaleX, scaleY, scaleZ],
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
        `Scaling failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
