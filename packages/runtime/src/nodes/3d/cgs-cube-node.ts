import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { BoxGeometry } from "three";
import { Brush } from "three-bvh-csg";
import { z } from "zod";
import { brushToGLTF, extractBrushStats } from "./csg-utils";

/**
 * Create a cube brush with specified dimensions
 */
function createCubeBrush(
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  center: boolean = false
): Brush {
  console.log(
    `[CSG] Creating cube brush: [${sizeX}, ${sizeY}, ${sizeZ}], center=${center}`
  );

  const geometry = new BoxGeometry(sizeX, sizeY, sizeZ);
  geometry.computeVertexNormals();

  // Keep UV coordinates for texture mapping (BoxGeometry generates them automatically)

  const brush = new Brush(geometry);

  if (center) {
    brush.position.set(-sizeX / 2, -sizeY / 2, -sizeZ / 2);
  }

  return brush;
}

export class CgsCubeNode extends ExecutableNode {
  private static readonly cubeInputSchema = z.object({
    size: z
      .union([
        z.number().positive("Size must be positive"),
        z
          .tuple([
            z.number().positive("Width must be positive"),
            z.number().positive("Height must be positive"),
            z.number().positive("Depth must be positive"),
          ])
          .describe("Size as [x, y, z]"),
      ])
      .describe("Cube size (single number or [x, y, z])"),
    center: z
      .boolean()
      .optional()
      .default(false)
      .describe("Center the cube at origin"),
  });

  public static readonly nodeType: NodeType = {
    id: "csg-cube",
    name: "CSG Cube",
    type: "csg-cube",
    description: "Create a cube primitive geometry",
    tags: ["3D", "Geometry", "Primitive"],
    icon: "box",
    documentation:
      "Creates a cube with specified dimensions. Size can be a single number for uniform dimensions or [x, y, z] for custom width, height, and depth.",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "size",
        type: "json",
        description: "Cube size: single number or [width, height, depth]",
        required: true,
      },
      {
        name: "center",
        type: "boolean",
        description: "Center the cube at the origin (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "mesh",
        type: "gltf",
        description: "3D cube geometry in glTF format",
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
      const validatedInput = CgsCubeNode.cubeInputSchema.parse(context.inputs);
      const { size, center } = validatedInput;

      // Parse size into [x, y, z]
      const [sizeX, sizeY, sizeZ] = Array.isArray(size)
        ? size
        : [size, size, size];

      console.log(
        `[CgsCubeNode] Creating cube with size [${sizeX}, ${sizeY}, ${sizeZ}], center=${center}`
      );

      // Create the cube brush using three-bvh-csg
      const brush = createCubeBrush(sizeX, sizeY, sizeZ, center);

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
          dimensions: { x: sizeX, y: sizeY, z: sizeZ },
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
        `Cube creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
