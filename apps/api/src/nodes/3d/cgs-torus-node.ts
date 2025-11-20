import { NodeExecution, NodeType } from "@dafthunk/types";
import { TorusGeometry } from "three";
import { Brush } from "three-bvh-csg";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  brushToGLTF,
  extractBrushStats,
} from "./csg-utils";

/**
 * Create a torus brush with specified dimensions
 */
function createTorusBrush(
  radius: number = 1,
  tubeRadius: number = 0.4,
  radialSegments: number = 16,
  tubularSegments: number = 8
): Brush {
  console.log(
    `[CSG] Creating torus brush: radius=${radius}, tubeRadius=${tubeRadius}, radialSegments=${radialSegments}, tubularSegments=${tubularSegments}`
  );

  const geometry = new TorusGeometry(radius, tubeRadius, radialSegments, tubularSegments);
  geometry.computeVertexNormals();

  // Keep UV coordinates for texture mapping (geometry generates them automatically)

  const brush = new Brush(geometry);

  return brush;
}

export class CgsTorusNode extends ExecutableNode {
  private static readonly torusInputSchema = z.object({
    radius: z
      .number()
      .positive("Radius must be positive")
      .default(1)
      .describe("Main torus radius"),
    tubeRadius: z
      .number()
      .positive("Tube radius must be positive")
      .default(0.4)
      .describe("Tube radius (thickness)"),
    radialSegments: z
      .number()
      .int()
      .min(3, "Radial segments must be at least 3")
      .default(16)
      .describe("Segments around main radius"),
    tubularSegments: z
      .number()
      .int()
      .min(3, "Tubular segments must be at least 3")
      .default(8)
      .describe("Segments around the tube"),
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
    id: "csg-torus",
    name: "CSG Torus",
    type: "csg-torus",
    description: "Create a torus (donut) primitive geometry",
    tags: ["3D", "Geometry", "Primitive"],
    icon: "box",
    documentation:
      "Creates a torus (donut shape) with specified main radius and tube radius. Adjust radial and tubular segments for quality vs. performance. Useful for rings, handles, and rounded shapes.",
    inlinable: false,
    inputs: [
      {
        name: "radius",
        type: "number",
        description: "Main torus radius (default: 1)",
        required: false,
      },
      {
        name: "tubeRadius",
        type: "number",
        description: "Tube radius/thickness (default: 0.4)",
        required: false,
      },
      {
        name: "radialSegments",
        type: "number",
        description: "Segments around main radius (default: 16, min: 3)",
        required: false,
      },
      {
        name: "tubularSegments",
        type: "number",
        description: "Segments around tube (default: 8, min: 3)",
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
        description: "3D torus geometry in glTF format",
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
      const validatedInput = CgsTorusNode.torusInputSchema.parse(context.inputs);
      const { radius, tubeRadius, radialSegments, tubularSegments, materialProperties } = validatedInput;

      console.log(
        `[CgsTorusNode] Creating torus with radius=${radius}, tubeRadius=${tubeRadius}, radialSegments=${radialSegments}, tubularSegments=${tubularSegments}`
      );

      // Create the torus brush using three-bvh-csg
      const brush = createTorusBrush(radius, tubeRadius, radialSegments, tubularSegments);

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
          tubeRadius,
          radialSegments,
          tubularSegments,
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
        `Torus creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
