import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  glTFToBrush,
  extractBrushStats,
  performUnion,
} from "./csg-utils";

export class CgsUnionNode extends ExecutableNode {
  private static readonly unionInputSchema = z.object({
    meshA: z
      .union([
        z.instanceof(Uint8Array),
        z.object({
          data: z.instanceof(Uint8Array),
          mimeType: z.string().optional(),
        }),
      ])
      .describe("First mesh (GLB binary format)"),
    meshB: z
      .union([
        z.instanceof(Uint8Array),
        z.object({
          data: z.instanceof(Uint8Array),
          mimeType: z.string().optional(),
        }),
      ])
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
    id: "csg-union",
    name: "CSG Union",
    type: "csg-union",
    description: "Combine two 3D meshes using CSG union operation",
    tags: ["3D", "CSG", "Boolean"],
    icon: "box",
    documentation:
      "Performs a constructive solid geometry union operation, combining two meshes into a single solid.",
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
        description: "Result mesh from union operation (GLB format)",
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
      const validatedInput = CgsUnionNode.unionInputSchema.parse(context.inputs);
      const { meshA, meshB, materialProperties } = validatedInput;

      console.log("[CgsUnionNode] Performing union operation...");

      // Extract GLB data from mesh inputs (handle both raw Uint8Array and mesh object formats)
      const meshAData = meshA instanceof Uint8Array ? meshA : meshA.data;
      const meshBData = meshB instanceof Uint8Array ? meshB : meshB.data;

      // Parse GLB data back to brushes
      const brushA = await glTFToBrush(meshAData);
      const brushB = await glTFToBrush(meshBData);

      // Perform union operation
      const { glb: resultGLB, resultBrush } = await performUnion(brushA, brushB, materialProperties);

      // Extract statistics from result brush
      const resultStats = extractBrushStats(resultBrush);

      return this.createSuccessResult({
        mesh: {
          data: resultGLB,
          mimeType: "model/gltf-binary" as const,
        },
        metadata: {
          vertexCount: resultStats.vertexCount,
          triangleCount: resultStats.triangleCount,
          operation: "union",
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
        `Union operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
