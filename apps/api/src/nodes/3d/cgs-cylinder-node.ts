import { NodeExecution, NodeType } from "@dafthunk/types";
import { CylinderGeometry } from "three";
import { Brush } from "three-bvh-csg";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { brushToGLTF, extractBrushStats } from "./csg-utils";

/**
 * Create a cylinder brush with specified dimensions
 */
function createCylinderBrush(
  height: number,
  radiusBottom: number,
  radiusTop: number = radiusBottom,
  radialSegments: number = 32,
  center: boolean = false
): Brush {
  console.log(
    `[CSG] Creating cylinder brush: height=${height}, radiusBottom=${radiusBottom}, radiusTop=${radiusTop}`
  );

  const geometry = new CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    radialSegments
  );
  geometry.computeVertexNormals();

  // Keep UV coordinates for texture mapping (geometry generates them automatically)

  const brush = new Brush(geometry);

  if (center) {
    brush.position.y = -height / 2;
  }

  return brush;
}

export class CgsCylinderNode extends ExecutableNode {
  private static readonly cylinderInputSchema = z.object({
    height: z
      .number()
      .positive("Height must be positive")
      .describe("Cylinder height"),
    radiusBottom: z
      .number()
      .positive("Bottom radius must be positive")
      .describe("Bottom circle radius"),
    radiusTop: z
      .number()
      .positive("Top radius must be positive")
      .optional()
      .describe(
        "Top circle radius (defaults to radiusBottom for true cylinder)"
      ),
    radialSegments: z
      .number()
      .int()
      .min(3, "Radial segments must be at least 3")
      .default(32)
      .describe("Circumference resolution"),
    center: z
      .boolean()
      .default(false)
      .describe("Center the cylinder vertically at origin"),
  });

  public static readonly nodeType: NodeType = {
    id: "csg-cylinder",
    name: "CSG Cylinder",
    type: "csg-cylinder",
    description: "Create a cylinder or cone primitive geometry",
    tags: ["3D", "Geometry", "Primitive"],
    icon: "box",
    documentation:
      "Creates a cylinder with specified height and radius. Provide different top and bottom radii to create cone shapes. Radial segments control the geometry resolution.",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "height",
        type: "number",
        description: "Cylinder height",
        required: true,
      },
      {
        name: "radiusBottom",
        type: "number",
        description: "Bottom circle radius",
        required: true,
      },
      {
        name: "radiusTop",
        type: "number",
        description: "Top circle radius (defaults to radiusBottom)",
        required: false,
      },
      {
        name: "radialSegments",
        type: "number",
        description: "Circumference resolution (default: 32, min: 3)",
        required: false,
      },
      {
        name: "center",
        type: "boolean",
        description: "Center vertically at origin (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "mesh",
        type: "gltf",
        description: "3D cylinder geometry in glTF format",
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
      const validatedInput = CgsCylinderNode.cylinderInputSchema.parse(
        context.inputs
      );
      const { height, radiusBottom, radiusTop, radialSegments, center } =
        validatedInput;

      // If radiusTop is not provided, use radiusBottom (creating a true cylinder)
      const topRadius = radiusTop ?? radiusBottom;

      console.log(
        `[CgsCylinderNode] Creating cylinder with height=${height}, radiusBottom=${radiusBottom}, radiusTop=${topRadius}, radialSegments=${radialSegments}, center=${center}`
      );

      // Create the cylinder brush using three-bvh-csg
      const brush = createCylinderBrush(
        height,
        radiusBottom,
        topRadius,
        radialSegments,
        center
      );

      // Convert brush to glTF GLB binary format
      const glbData = await brushToGLTF(brush);

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
          height,
          radiusBottom,
          radiusTop: topRadius,
          radialSegments,
          centered: center,
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
        `Cylinder creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
