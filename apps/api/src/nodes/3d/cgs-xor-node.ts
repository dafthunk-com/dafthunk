import { NodeExecution, NodeType } from "@dafthunk/types";
import { ADDITION, Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { brushToGLTF, extractBrushStats, glTFToBrush } from "./csg-utils";

interface CSGOperationResult {
  glb: Uint8Array;
  resultBrush: Brush;
}

/**
 * Perform a CSG XOR (symmetric difference) operation on two brushes
 * XOR(A, B) = (A - B) + (B - A)
 */
async function performXOR(
  brushA: Brush,
  brushB: Brush,
  materialProperties?: {
    baseColorFactor?: readonly [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  },
  textureData?: Uint8Array
): Promise<CSGOperationResult> {
  const statsA = extractBrushStats(brushA);
  const statsB = extractBrushStats(brushB);
  console.log(
    `[CSG] Performing XOR operation... Input A: ${statsA.vertexCount} vertices, ${statsA.triangleCount} triangles. Input B: ${statsB.vertexCount} vertices, ${statsB.triangleCount} triangles`
  );

  const evaluator = new Evaluator();
  evaluator.attributes = ["position", "normal", "uv"];

  const aMinusB = evaluator.evaluate(brushA, brushB, SUBTRACTION);
  const bMinusA = evaluator.evaluate(brushB, brushA, SUBTRACTION);
  const result = evaluator.evaluate(aMinusB, bMinusA, ADDITION);

  const resultStats = extractBrushStats(result);
  console.log(
    `[CSG] XOR complete. Result: ${resultStats.vertexCount} vertices, ${resultStats.triangleCount} triangles`
  );

  const glb = await brushToGLTF(result, materialProperties, textureData);
  return { glb, resultBrush: result };
}

export class CgsXorNode extends ExecutableNode {
  private static readonly xorInputSchema = z.object({
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
  });

  public static readonly nodeType: NodeType = {
    id: "csg-xor",
    name: "CSG XOR",
    type: "csg-xor",
    description: "Perform XOR (symmetric difference) on two 3D meshes",
    tags: ["3D", "CSG", "Boolean"],
    icon: "box",
    documentation:
      "Performs a constructive solid geometry XOR (symmetric difference) operation. Returns the parts that are in A or B, but not in both. Equivalent to (A - B) + (B - A).",
    inlinable: false,
    usage: 10,
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
    ],
    outputs: [
      {
        name: "mesh",
        type: "gltf",
        description: "Result mesh from XOR operation (GLB format)",
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
      const validatedInput = CgsXorNode.xorInputSchema.parse(context.inputs);
      const { meshA, meshB } = validatedInput;

      console.log("[CgsXorNode] Performing XOR operation...");

      const meshAData = meshA instanceof Uint8Array ? meshA : meshA.data;
      const meshBData = meshB instanceof Uint8Array ? meshB : meshB.data;

      const { brush: brushA, materialData: materialDataA } =
        await glTFToBrush(meshAData);
      const { brush: brushB, materialData: materialDataB } =
        await glTFToBrush(meshBData);

      // Auto-resolve texture and material from inputs (with conflict handling)
      let finalTexture: Uint8Array | undefined;
      let finalMaterialProps;

      if (materialDataA.textureData && materialDataB.textureData) {
        // Both inputs have textures - can't properly combine them
        console.warn(
          "[CSG XOR] Both inputs have textures. CSG operations cannot properly combine multiple textures. Using solid material instead."
        );
        finalTexture = undefined;
        finalMaterialProps = undefined; // Use default solid material
      } else if (materialDataA.textureData) {
        // Only A has texture
        finalTexture = materialDataA.textureData;
        finalMaterialProps = undefined; // Use defaults to avoid tinting
      } else if (materialDataB.textureData) {
        // Only B has texture
        finalTexture = materialDataB.textureData;
        finalMaterialProps = undefined;
      } else {
        // Neither has texture, preserve material properties from A
        finalTexture = undefined;
        finalMaterialProps = materialDataA.materialProperties;
      }

      const { glb: resultGLB, resultBrush } = await performXOR(
        brushA,
        brushB,
        finalMaterialProps,
        finalTexture
      );

      const resultStats = extractBrushStats(resultBrush);

      return this.createSuccessResult({
        mesh: {
          data: resultGLB,
          mimeType: "model/gltf-binary" as const,
        },
        metadata: {
          vertexCount: resultStats.vertexCount,
          triangleCount: resultStats.triangleCount,
          operation: "xor",
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
        `XOR operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
