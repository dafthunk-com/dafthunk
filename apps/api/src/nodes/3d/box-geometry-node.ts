import { NodeExecution, NodeType } from "@dafthunk/types";
import { BoxGeometry } from "three/src/geometries/BoxGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class BoxGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "box-geometry",
    name: "Box Geometry",
    type: "box-geometry",
    description: "Creates a Three.js BoxGeometry with configurable dimensions",
    tags: ["3D"],
    icon: "cube",
    documentation: `Creates a simple box geometry using Three.js with configurable width, height, and depth.

## Usage Example

**Input**: 
\`\`\`json
{
  "width": 1,
  "height": 1,
  "depth": 1,
  "widthSegments": 1,
  "heightSegments": 1,
  "depthSegments": 1
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a box`,
    inlinable: true,
    inputs: [
      {
        name: "width",
        type: "number",
        description: "Width of the box (X-axis)",
        required: false,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the box (Y-axis)",
        required: false,
      },
      {
        name: "depth",
        type: "number",
        description: "Depth of the box (Z-axis)",
        required: false,
      },
      {
        name: "widthSegments",
        type: "number",
        description: "Number of segments along the width",
        required: false,
      },
      {
        name: "heightSegments",
        type: "number",
        description: "Number of segments along the height",
        required: false,
      },
      {
        name: "depthSegments",
        type: "number",
        description: "Number of segments along the depth",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Box geometry data in buffer format",
      },
      {
        name: "metadata",
        type: "json",
        description: "Geometry metadata (vertex count, dimensions)",
      },
    ],
  };

  private static readonly inputSchema = z.object({
    width: z.number().positive().default(1),
    height: z.number().positive().default(1),
    depth: z.number().positive().default(1),
    widthSegments: z.number().int().min(1).default(1),
    heightSegments: z.number().int().min(1).default(1),
    depthSegments: z.number().int().min(1).default(1),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = BoxGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js BoxGeometry
      const geometry = new BoxGeometry(
        inputs.width,
        inputs.height,
        inputs.depth,
        inputs.widthSegments,
        inputs.heightSegments,
        inputs.depthSegments
      );

      // Extract geometry data
      const positions = geometry.getAttribute("position");
      const normals = geometry.getAttribute("normal");
      const uvs = geometry.getAttribute("uv");
      const indices = geometry.getIndex();

      if (!positions || !normals || !uvs || !indices) {
        return this.createErrorResult("Failed to extract geometry attributes");
      }

      // Convert to the expected format
      const positionsArray = new Float32Array(positions.array);
      const normalsArray = new Float32Array(normals.array);
      const uvsArray = new Float32Array(uvs.array);
      const indicesArray = new Uint32Array(indices.array);

      // Create buffer geometry in the expected format
      const bufferGeometry = createBufferGeometry({
        positions: positionsArray,
        indices: indicesArray,
        normals: normalsArray,
        uvs: uvsArray,
      });

      // Calculate metadata
      const vertexCount = positionsArray.length / 3;
      const triangleCount = indicesArray.length / 3;

      return this.createSuccessResult({
        bufferGeometry: {
          data: bufferGeometry,
          mimeType: "application/x-buffer-geometry",
        },
        metadata: {
          vertexCount,
          triangleCount,
          dimensions: {
            width: inputs.width,
            height: inputs.height,
            depth: inputs.depth,
          },
          segments: {
            width: inputs.widthSegments,
            height: inputs.heightSegments,
            depth: inputs.depthSegments,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create box geometry: ${errorMessage}`
      );
    }
  }
}
