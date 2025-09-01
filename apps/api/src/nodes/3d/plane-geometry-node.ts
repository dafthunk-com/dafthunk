import { NodeExecution, NodeType } from "@dafthunk/types";
import { PlaneGeometry } from "three/src/geometries/PlaneGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class PlaneGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "plane-geometry",
    name: "Plane Geometry",
    type: "plane-geometry",
    description:
      "Creates a Three.js PlaneGeometry with configurable width, height, and segments",
    tags: ["3D"],
    icon: "square",
    documentation: `Creates a plane geometry using Three.js with configurable width, height, and segments.

## Usage Example

**Input**: 
\`\`\`json
{
  "width": 1,
  "height": 1,
  "widthSegments": 1,
  "heightSegments": 1
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a plane`,
    inlinable: true,
    inputs: [
      {
        name: "width",
        type: "number",
        description: "Width of the plane (X-axis)",
        required: false,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the plane (Y-axis)",
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
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Plane geometry data in buffer format",
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
    widthSegments: z.number().int().min(1).default(1),
    heightSegments: z.number().int().min(1).default(1),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = PlaneGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js PlaneGeometry
      const geometry = new PlaneGeometry(
        inputs.width,
        inputs.height,
        inputs.widthSegments,
        inputs.heightSegments
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
          },
          segments: {
            width: inputs.widthSegments,
            height: inputs.heightSegments,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create plane geometry: ${errorMessage}`
      );
    }
  }
}
