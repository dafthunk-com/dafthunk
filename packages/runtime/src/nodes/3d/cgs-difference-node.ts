import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { type Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { z } from "zod";
import type { GLTFMaterialData } from "./csg-utils";
import { brushToGLTF, extractBrushStats, glTFToBrush } from "./csg-utils";

interface CSGOperationResult {
  glb: Uint8Array;
  resultBrush: Brush;
}

/**
 * Perform a CSG difference operation on two brushes (A - B)
 */
async function performDifference(
  brushA: Brush,
  brushB: Brush,
  materialProperties?: {
    baseColorFactor?: readonly [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  },
  textureData?: Uint8Array
): Promise<CSGOperationResult> {
  try {
    const statsA = extractBrushStats(brushA);
    const statsB = extractBrushStats(brushB);
    console.log(
      `[CSG] Performing difference operation (A - B)... Input A: ${statsA.vertexCount} vertices, ${statsA.triangleCount} triangles. Input B: ${statsB.vertexCount} vertices, ${statsB.triangleCount} triangles`
    );

    const evaluator = new Evaluator();
    evaluator.attributes = ["position", "normal", "uv"];
    const result = evaluator.evaluate(brushA, brushB, SUBTRACTION);

    const resultStats = extractBrushStats(result);
    console.log(
      `[CSG] Difference complete. Result: ${resultStats.vertexCount} vertices, ${resultStats.triangleCount} triangles`
    );

    if (resultStats.vertexCount === 0 || resultStats.triangleCount === 0) {
      throw new Error(
        "Difference operation produced empty geometry - the second shape may completely contain the first"
      );
    }

    const glb = await brushToGLTF(result, materialProperties, textureData);
    return { glb, resultBrush: result };
  } catch (error) {
    console.error("[CSG] Error in performDifference:", error);
    throw error;
  }
}

export class CgsDifferenceNode extends ExecutableNode {
  private static readonly differenceInputSchema = z.object({
    meshA: z
      .union([
        z.instanceof(Uint8Array),
        z.object({
          data: z.instanceof(Uint8Array),
          mimeType: z.string().optional(),
        }),
      ])
      .describe("Base mesh (GLB binary format)"),
    meshB: z
      .union([
        z.instanceof(Uint8Array),
        z.object({
          data: z.instanceof(Uint8Array),
          mimeType: z.string().optional(),
        }),
      ])
      .describe("Mesh to subtract (GLB binary format)"),
  });

  public static readonly nodeType: NodeType = {
    id: "csg-difference",
    name: "CSG Difference",
    type: "csg-difference",
    description:
      "Subtract one 3D mesh from another using CSG difference operation",
    tags: ["3D", "CSG", "Boolean"],
    icon: "box",
    documentation:
      "Performs a constructive solid geometry difference operation, subtracting the second mesh from the first (A - B).",
    inlinable: false,
    usage: 10,
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
      const validatedInput = CgsDifferenceNode.differenceInputSchema.parse(
        context.inputs
      );
      const { meshA, meshB } = validatedInput;

      console.log(
        "[CgsDifferenceNode] Performing difference operation (A - B)..."
      );

      // Extract GLB data from mesh inputs (handle both raw Uint8Array and mesh object formats)
      const meshAData = meshA instanceof Uint8Array ? meshA : meshA.data;
      const meshBData = meshB instanceof Uint8Array ? meshB : meshB.data;

      // Parse GLB data back to brushes with material data
      const { brush: brushA, materialData: materialDataA } =
        await glTFToBrush(meshAData);
      const { brush: brushB, materialData: materialDataB } =
        await glTFToBrush(meshBData);

      // Auto-resolve texture and material from inputs (with conflict handling)
      let finalTexture: Uint8Array | undefined;
      let finalMaterialProps: GLTFMaterialData["materialProperties"];

      if (materialDataA.textureData && materialDataB.textureData) {
        // Both inputs have textures - can't properly combine them
        console.warn(
          "[CSG Difference] Both inputs have textures. CSG operations cannot properly combine multiple textures. Using solid material instead."
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

      // Perform difference operation
      const { glb: resultGLB, resultBrush } = await performDifference(
        brushA,
        brushB,
        finalMaterialProps,
        finalTexture
      );

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
          operation: "difference",
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
        `Difference operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
