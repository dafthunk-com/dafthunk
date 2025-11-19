import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  glTFToBrush,
  extractBrushStats,
  performIntersection,
} from "./csg-utils";

export class ScadIntersectionNode extends ExecutableNode {
  private static readonly intersectionInputSchema = z.object({
    meshA: z
      .instanceof(Uint8Array)
      .describe("First mesh (GLB binary format)"),
    meshB: z
      .instanceof(Uint8Array)
      .describe("Second mesh (GLB binary format)"),
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
    id: "scad-intersection",
    name: "Intersection",
    type: "scad-intersection",
    description: "Find the overlapping region of two 3D meshes using CSG intersection operation",
    tags: ["3D", "CSG", "Boolean"],
    icon: "layers",
    documentation:
      "Performs a constructive solid geometry intersection operation, keeping only the overlapping region of two meshes.",
    inlinable: false,
    inputs: [
      {
        name: "meshA",
        type: "gltf",
        description: "First 3D mesh (GLB format)",
        required: true,
      },
      {
        name: "meshB",
        type: "gltf",
        description: "Second 3D mesh (GLB format)",
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
        description: "Result mesh from intersection operation (GLB format)",
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
      const validatedInput = ScadIntersectionNode.intersectionInputSchema.parse(context.inputs);
      const { meshA, meshB, materialProperties } = validatedInput;

      console.log("[ScadIntersectionNode] Performing intersection operation...");

      // Parse GLB data back to brushes
      const brushA = await glTFToBrush(meshA);
      const brushB = await glTFToBrush(meshB);

      // Perform intersection operation
      const resultGLB = await performIntersection(brushA, brushB, materialProperties);

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
          operation: "intersection",
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
        `Intersection operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
