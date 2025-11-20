import { NodeExecution, NodeType } from "@dafthunk/types";
import { Brush, Evaluator, INTERSECTION } from "three-bvh-csg";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  glTFToBrush,
  extractBrushStats,
  brushToGLTF,
} from "./csg-utils";

interface CSGOperationResult {
  glb: Uint8Array;
  resultBrush: Brush;
}

/**
 * Perform a CSG intersection operation on two brushes
 */
async function performIntersection(
  brushA: Brush,
  brushB: Brush,
  materialProperties?: {
    baseColorFactor?: readonly [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  }
): Promise<CSGOperationResult> {
  const statsA = extractBrushStats(brushA);
  const statsB = extractBrushStats(brushB);
  console.log(
    `[CSG] Performing intersection operation... Input A: ${statsA.vertexCount} vertices, ${statsA.triangleCount} triangles. Input B: ${statsB.vertexCount} vertices, ${statsB.triangleCount} triangles`
  );

  const evaluator = new Evaluator();
  evaluator.attributes = ["position", "normal"];
  const result = evaluator.evaluate(brushA, brushB, INTERSECTION);

  const resultStats = extractBrushStats(result);
  console.log(`[CSG] Intersection complete. Result: ${resultStats.vertexCount} vertices, ${resultStats.triangleCount} triangles`);

  if (resultStats.vertexCount === 0 || resultStats.triangleCount === 0) {
    throw new Error(
      "Intersection produced empty geometry - the shapes may not overlap or their overlap is too small"
    );
  }

  const glb = await brushToGLTF(result, materialProperties);
  return { glb, resultBrush: result };
}

export class CgsIntersectionNode extends ExecutableNode {
  private static readonly intersectionInputSchema = z.object({
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
    id: "csg-intersection",
    name: "CSG Intersection",
    type: "csg-intersection",
    description: "Find the overlapping region of two 3D meshes using CSG intersection operation",
    tags: ["3D", "CSG", "Boolean"],
    icon: "box",
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
      const validatedInput = CgsIntersectionNode.intersectionInputSchema.parse(context.inputs);
      const { meshA, meshB, materialProperties } = validatedInput;

      console.log("[CgsIntersectionNode] Performing intersection operation...");

      // Extract GLB data from mesh inputs (handle both raw Uint8Array and mesh object formats)
      const meshAData = meshA instanceof Uint8Array ? meshA : meshA.data;
      const meshBData = meshB instanceof Uint8Array ? meshB : meshB.data;

      // Parse GLB data back to brushes
      const brushA = await glTFToBrush(meshAData);
      const brushB = await glTFToBrush(meshBData);

      // Perform intersection operation
      const { glb: resultGLB, resultBrush } = await performIntersection(brushA, brushB, materialProperties);

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
