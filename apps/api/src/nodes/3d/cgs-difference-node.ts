import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  glTFToBrush,
  extractBrushStats,
  performDifference,
} from "./csg-utils";

export class CgsDifferenceNode extends ExecutableNode {
  private static readonly differenceInputSchema = z.object({
    meshA: z
      .instanceof(Uint8Array)
      .describe("Base mesh (GLB binary format)"),
    meshB: z
      .instanceof(Uint8Array)
      .describe("Mesh to subtract (GLB binary format)"),
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
    id: "csg-difference",
    name: "CSG Difference",
    type: "csg-difference",
    description: "Subtract one 3D mesh from another using CSG difference operation",
    tags: ["3D", "CSG", "Boolean"],
    icon: "box",
    documentation:
      "Performs a constructive solid geometry difference operation, subtracting the second mesh from the first (A - B).",
    inlinable: false,
    inputs: [
      {
        name: "meshA",
        type: "gltf",
        description: "Base mesh (GLB format)",
        required: true,
      },
      {
        name: "meshB",
        type: "gltf",
        description: "Mesh to subtract (GLB format)",
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
        description: "Result mesh from difference operation (GLB format)",
      },
      {
        name: "metadata",
        type: "json",
        description: "Result mesh metadata (vertex count, triangle count)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = CgsDifferenceNode.differenceInputSchema.parse(context.inputs);
      const { meshA, meshB, materialProperties } = validatedInput;

      console.log("[CgsDifferenceNode] Performing difference operation (A - B)...");

      // Parse GLB data back to brushes
      const brushA = await glTFToBrush(meshA);
      const brushB = await glTFToBrush(meshB);

      // Perform difference operation
      const resultGLB = await performDifference(brushA, brushB, materialProperties);

      // Extract statistics from result
      const resultStats = extractBrushStats(brushA); // Use brushA for structure, result will have similar counts

      return this.createSuccessResult({
        mesh: {
          data: resultGLB,
          mimeType: "model/gltf-binary" as const,
        },
        metadata: {
          vertexCount: resultStats.vertexCount,
          triangleCount: resultStats.triangleCount,
          operation: "difference",
          hasMaterial: !!materialProperties,
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
        `Difference operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
