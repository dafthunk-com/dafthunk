import { NodeExecution, NodeType } from "@dafthunk/types";
import { CircleGeometry } from "three/src/geometries/CircleGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class CircleGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "circle-geometry",
    name: "Circle Geometry",
    type: "circle-geometry",
    description:
      "Creates a Three.js CircleGeometry with configurable radius and segments",
    tags: ["3D"],
    icon: "circle",
    documentation: `Creates a circle geometry using Three.js with configurable radius and segments.

## Usage Example

**Input**: 
\`\`\`json
{
  "radius": 1,
  "segments": 32,
  "thetaStart": 0,
  "thetaLength": 6.283185307179586
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a circle`,
    inlinable: true,
    inputs: [
      {
        name: "radius",
        type: "number",
        description: "Radius of the circle",
        required: false,
      },
      {
        name: "segments",
        type: "number",
        description: "Number of segments around the circumference",
        required: false,
      },
      {
        name: "thetaStart",
        type: "number",
        description: "Start angle for the first segment",
        required: false,
      },
      {
        name: "thetaLength",
        type: "number",
        description:
          "The central angle, often called theta, of the circular sector",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Circle geometry data in buffer format",
      },
      {
        name: "metadata",
        type: "json",
        description: "Geometry metadata (vertex count, dimensions)",
      },
    ],
  };

  private static readonly inputSchema = z.object({
    radius: z.number().positive().default(1),
    segments: z.number().int().min(3).default(32),
    thetaStart: z.number().default(0),
    thetaLength: z.number().default(2 * Math.PI),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = CircleGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js CircleGeometry
      const geometry = new CircleGeometry(
        inputs.radius,
        inputs.segments,
        inputs.thetaStart,
        inputs.thetaLength
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
            radius: inputs.radius,
            diameter: inputs.radius * 2,
            circumference: inputs.radius * 2 * Math.PI,
            area: inputs.radius * inputs.radius * Math.PI,
          },
          segments: {
            segments: inputs.segments,
            thetaStart: inputs.thetaStart,
            thetaLength: inputs.thetaLength,
            isFullCircle: Math.abs(inputs.thetaLength - 2 * Math.PI) < 0.001,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create circle geometry: ${errorMessage}`
      );
    }
  }
}
