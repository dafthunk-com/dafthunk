import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  brushToGLTF,
  createCubeBrush,
  extractBrushStats,
} from "./csg-utils";

export class ScadCubeNode extends ExecutableNode {
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
    id: "scad-cube",
    name: "Cube",
    type: "scad-cube",
    description: "Create a cube primitive geometry",
    tags: ["3D", "Geometry", "Primitive"],
    icon: "box3d",
    documentation:
      "Creates a cube with specified dimensions. Size can be a single number for uniform dimensions or [x, y, z] for custom width, height, and depth.",
    inlinable: false,
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
      const validatedInput = ScadCubeNode.cubeInputSchema.parse(context.inputs);
      const { size, center, materialProperties } = validatedInput;

      // Parse size into [x, y, z]
      const [sizeX, sizeY, sizeZ] = Array.isArray(size)
        ? size
        : [size, size, size];

      console.log(
        `[ScadCubeNode] Creating cube with size [${sizeX}, ${sizeY}, ${sizeZ}], center=${center}`
      );

      // Create the cube brush using three-bvh-csg
      const brush = createCubeBrush(sizeX, sizeY, sizeZ, center);

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
          dimensions: { x: sizeX, y: sizeY, z: sizeZ },
          centered: center,
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
        `Cube creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
