import { NodeExecution, NodeType } from "@dafthunk/types";
import { SphereGeometry } from "three";
import { Brush } from "three-bvh-csg";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  brushToGLTF,
  extractBrushStats,
} from "./csg-utils";

/**
 * Create a sphere brush with specified radius
 */
function createSphereBrush(
  radius: number,
  widthSegments: number = 32,
  heightSegments: number = 32
): Brush {
  console.log(
    `[CSG] Creating sphere brush: radius=${radius}, segments=${widthSegments}x${heightSegments}`
  );

  const geometry = new SphereGeometry(radius, widthSegments, heightSegments);
  geometry.computeVertexNormals();

  if (geometry.hasAttribute("uv")) {
    geometry.deleteAttribute("uv");
  }

  const brush = new Brush(geometry);

  return brush;
}

export class CgsSphereNode extends ExecutableNode {
  private static readonly sphereInputSchema = z.object({
    radius: z
      .number()
      .positive("Radius must be positive")
      .describe("Sphere radius"),
    widthSegments: z
      .number()
      .int()
      .min(3, "Width segments must be at least 3")
      .default(32)
      .describe("Horizontal resolution (vertex count around circumference)"),
    heightSegments: z
      .number()
      .int()
      .min(2, "Height segments must be at least 2")
      .default(32)
      .describe("Vertical resolution (vertex count top to bottom)"),
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
    id: "csg-sphere",
    name: "CSG Sphere",
    type: "csg-sphere",
    description: "Create a sphere primitive geometry",
    tags: ["3D", "Geometry", "Primitive"],
    icon: "box",
    documentation:
      "Creates a sphere with specified radius. Width and height segments control the geometry resolution for quality vs. performance trade-offs.",
    inlinable: false,
    inputs: [
      {
        name: "radius",
        type: "number",
        description: "Sphere radius",
        required: true,
      },
      {
        name: "widthSegments",
        type: "number",
        description: "Horizontal resolution (default: 32, min: 3)",
        required: false,
      },
      {
        name: "heightSegments",
        type: "number",
        description: "Vertical resolution (default: 32, min: 2)",
        required: false,
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
        description: "3D sphere geometry in glTF format",
      },
      {
        name: "metadata",
        type: "json",
        description: "Mesh metadata (vertex count, triangle count)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = CgsSphereNode.sphereInputSchema.parse(context.inputs);
      const { radius, widthSegments, heightSegments, materialProperties } = validatedInput;

      console.log(
        `[CgsSphereNode] Creating sphere with radius=${radius}, widthSegments=${widthSegments}, heightSegments=${heightSegments}`
      );

      // Create the sphere brush using three-bvh-csg
      const brush = createSphereBrush(radius, widthSegments, heightSegments);

      // Convert brush to glTF GLB binary format
      const glbData = await brushToGLTF(brush, materialProperties);

      // Extract statistics
      const stats = extractBrushStats(brush);

      return this.createSuccessResult({
        mesh: {
          data: glbData,
          mimeType: "model/gltf-binary" as const,
        },
        metadata: {
          vertexCount: stats.vertexCount,
          triangleCount: stats.triangleCount,
          radius,
          widthSegments,
          heightSegments,
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
        `Sphere creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
