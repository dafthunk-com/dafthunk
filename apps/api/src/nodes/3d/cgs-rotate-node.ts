import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { brushToGLTF, extractBrushStats, glTFToBrush } from "./csg-utils";

export class CgsRotateNode extends ExecutableNode {
  private static readonly rotateInputSchema = z.object({
    mesh: z
      .union([
        z.instanceof(Uint8Array),
        z.object({
          data: z.instanceof(Uint8Array),
          mimeType: z.string().optional(),
        }),
      ])
      .describe("Input mesh (GLB binary format)"),
    rotation: z
      .tuple([z.number(), z.number(), z.number()])
      .describe("Rotation in degrees [x, y, z]"),
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
    id: "csg-rotate",
    name: "CSG Rotate",
    type: "csg-rotate",
    description: "Rotate a 3D mesh around axes",
    tags: ["3D", "CSG", "Transform"],
    icon: "rotate-cw",
    documentation:
      "Rotates a 3D mesh by the specified angles in degrees [x, y, z]. Rotation is applied in XYZ order (Euler angles).",
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
        name: "rotation",
        type: "json",
        description: "Rotation in degrees as [x, y, z]",
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
        description: "Rotated mesh (GLB format)",
      },
      {
        name: "metadata",
        type: "json",
        description: "Mesh metadata (vertex count, triangle count, rotation)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = CgsRotateNode.rotateInputSchema.parse(
        context.inputs
      );
      const { mesh, rotation, materialProperties } = validatedInput;

      console.log(
        `[CgsRotateNode] Rotating mesh by [${rotation[0]}°, ${rotation[1]}°, ${rotation[2]}°]`
      );

      const meshData = mesh instanceof Uint8Array ? mesh : mesh.data;
      const { brush, materialData } = await glTFToBrush(meshData);

      const rotationRad = rotation.map((deg) => (deg * Math.PI) / 180);
      brush.rotation.set(rotationRad[0], rotationRad[1], rotationRad[2]);
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
          rotation,
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
        `Rotation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
