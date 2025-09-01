import { NodeExecution, NodeType } from "@dafthunk/types";
import { RingGeometry } from "three/src/geometries/RingGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class RingGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "ring-geometry",
    name: "Ring Geometry",
    type: "ring-geometry",
    description:
      "Creates a Three.js RingGeometry with configurable inner/outer radius and segments",
    tags: ["3D"],
    icon: "circle",
    documentation: `Creates a ring geometry using Three.js with configurable inner radius, outer radius, and segments.

## Usage Example

**Input**: 
\`\`\`json
{
  "innerRadius": 0.5,
  "outerRadius": 1,
  "thetaSegments": 32,
  "phiSegments": 1,
  "thetaStart": 0,
  "thetaLength": 6.283185307179586
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a ring`,
    inlinable: true,
    inputs: [
      {
        name: "innerRadius",
        type: "number",
        description: "Inner radius of the ring",
        required: false,
      },
      {
        name: "outerRadius",
        type: "number",
        description: "Outer radius of the ring",
        required: false,
      },
      {
        name: "thetaSegments",
        type: "number",
        description: "Number of segments around the circumference",
        required: false,
      },
      {
        name: "phiSegments",
        type: "number",
        description: "Number of segments from inner to outer radius",
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
        description: "Ring geometry data in buffer format",
      },
      {
        name: "metadata",
        type: "json",
        description: "Geometry metadata (vertex count, dimensions)",
      },
    ],
  };

  private static readonly inputSchema = z
    .object({
      innerRadius: z.number().positive().default(0.5),
      outerRadius: z.number().positive().default(1),
      thetaSegments: z.number().int().min(3).default(32),
      phiSegments: z.number().int().min(1).default(1),
      thetaStart: z.number().default(0),
      thetaLength: z.number().default(2 * Math.PI),
    })
    .refine((data) => data.outerRadius > data.innerRadius, {
      message: "Outer radius must be greater than inner radius",
      path: ["outerRadius"],
    });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = RingGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js RingGeometry
      const geometry = new RingGeometry(
        inputs.innerRadius,
        inputs.outerRadius,
        inputs.thetaSegments,
        inputs.phiSegments,
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
            innerRadius: inputs.innerRadius,
            outerRadius: inputs.outerRadius,
            thickness: inputs.outerRadius - inputs.innerRadius,
          },
          segments: {
            theta: inputs.thetaSegments,
            phi: inputs.phiSegments,
          },
          angles: {
            start: inputs.thetaStart,
            length: inputs.thetaLength,
            isFullCircle: Math.abs(inputs.thetaLength - 2 * Math.PI) < 0.001,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create ring geometry: ${errorMessage}`
      );
    }
  }
}
