import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { ConeGeometry } from "three";
import { Brush } from "three-bvh-csg";
import { z } from "zod";
import { brushToGLTF, extractBrushStats } from "./csg-utils";

/**
 * Create a cone brush with specified dimensions
 */
function createConeBrush(
  height: number,
  radius: number = 1,
  radialSegments: number = 32,
  heightSegments: number = 1,
  openEnded: boolean = false,
  center: boolean = false
): Brush {
  console.log(
    `[CSG] Creating cone brush: height=${height}, radius=${radius}, radialSegments=${radialSegments}, center=${center}`
  );

  const geometry = new ConeGeometry(
    radius,
    height,
    radialSegments,
    heightSegments,
    openEnded
  );
  geometry.computeVertexNormals();

  // Keep UV coordinates for texture mapping (geometry generates them automatically)

  const brush = new Brush(geometry);

  if (center) {
    brush.position.y = -height / 2;
  }

  return brush;
}

export class CgsConeNode extends ExecutableNode {
  private static readonly coneInputSchema = z.object({
    height: z
      .number()
      .positive("Height must be positive")
      .describe("Cone height"),
    radius: z
      .number()
      .positive("Radius must be positive")
      .default(1)
      .describe("Cone base radius"),
    radialSegments: z
      .number()
      .int()
      .min(3, "Radial segments must be at least 3")
      .default(32)
      .describe("Circumference resolution"),
    heightSegments: z
      .number()
      .int()
      .min(1, "Height segments must be at least 1")
      .default(1)
      .describe("Vertical resolution"),
    openEnded: z
      .boolean()
      .default(false)
      .describe("Whether the cone base is open"),
    center: z
      .boolean()
      .default(false)
      .describe("Center the cone vertically at origin"),
  });

  public static readonly nodeType: NodeType = {
    id: "csg-cone",
    name: "CSG Cone",
    type: "csg-cone",
    description: "Create a cone primitive geometry",
    tags: ["3D", "Geometry", "Primitive"],
    icon: "box",
    documentation:
      "Creates a cone with specified height and base radius. Can be made open-ended for pipe-like shapes. Radial segments control the geometry resolution around the circumference.",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "height",
        type: "number",
        description: "Cone height",
        required: true,
      },
      {
        name: "radius",
        type: "number",
        description: "Cone base radius (default: 1)",
        required: false,
      },
      {
        name: "radialSegments",
        type: "number",
        description: "Circumference resolution (default: 32, min: 3)",
        required: false,
      },
      {
        name: "heightSegments",
        type: "number",
        description: "Vertical resolution (default: 1, min: 1)",
        required: false,
      },
      {
        name: "openEnded",
        type: "boolean",
        description: "Open base of cone (default: false)",
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
        description: "3D cone geometry in glTF format",
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
      const validatedInput = CgsConeNode.coneInputSchema.parse(context.inputs);
      const {
        height,
        radius,
        radialSegments,
        heightSegments,
        openEnded,
        center,
      } = validatedInput;

      console.log(
        `[CgsConeNode] Creating cone with height=${height}, radius=${radius}, radialSegments=${radialSegments}, center=${center}`
      );

      // Create the cone brush using three-bvh-csg
      const brush = createConeBrush(
        height,
        radius,
        radialSegments,
        heightSegments,
        openEnded,
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
          radius,
          radialSegments,
          heightSegments,
          openEnded,
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
        `Cone creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
