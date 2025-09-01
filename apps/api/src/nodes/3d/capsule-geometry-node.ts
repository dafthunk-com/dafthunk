import { NodeExecution, NodeType } from "@dafthunk/types";
import { CapsuleGeometry } from "three/src/geometries/CapsuleGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class CapsuleGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "capsule-geometry",
    name: "Capsule Geometry",
    type: "capsule-geometry",
    description:
      "Creates a Three.js CapsuleGeometry with configurable radius and length",
    tags: ["3D"],
    icon: "circle",
    documentation: `Creates a capsule geometry using Three.js with configurable radius, length, and segments.

## Usage Example

**Input**: 
\`\`\`json
{
  "radius": 1,
  "length": 2,
  "capSegments": 4,
  "radialSegments": 8
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a capsule`,
    inlinable: true,
    inputs: [
      {
        name: "radius",
        type: "number",
        description: "Radius of the capsule",
        required: false,
      },
      {
        name: "length",
        type: "number",
        description:
          "Length of the capsule (distance between the centers of the end spheres)",
        required: false,
      },
      {
        name: "capSegments",
        type: "number",
        description: "Number of segments along the caps (end spheres)",
        required: false,
      },
      {
        name: "radialSegments",
        type: "number",
        description: "Number of segments around the circumference",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Capsule geometry data in buffer format",
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
    length: z.number().positive().default(1),
    capSegments: z.number().int().min(1).default(4),
    radialSegments: z.number().int().min(3).default(8),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = CapsuleGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js CapsuleGeometry
      const geometry = new CapsuleGeometry(
        inputs.radius,
        inputs.length,
        inputs.capSegments,
        inputs.radialSegments
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
            length: inputs.length,
            diameter: inputs.radius * 2,
            totalLength: inputs.length + inputs.radius * 2,
          },
          segments: {
            capSegments: inputs.capSegments,
            radialSegments: inputs.radialSegments,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create capsule geometry: ${errorMessage}`
      );
    }
  }
}
