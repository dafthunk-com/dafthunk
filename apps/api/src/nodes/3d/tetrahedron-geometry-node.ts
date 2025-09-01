import { NodeExecution, NodeType } from "@dafthunk/types";
import { TetrahedronGeometry } from "three/src/geometries/TetrahedronGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class TetrahedronGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "tetrahedron-geometry",
    name: "Tetrahedron Geometry",
    type: "tetrahedron-geometry",
    description:
      "Creates a Three.js TetrahedronGeometry with configurable radius and detail",
    tags: ["3D"],
    icon: "triangle",
    documentation: `Creates a tetrahedron geometry using Three.js with configurable radius and detail level.

## Usage Example

**Input**: 
\`\`\`json
{
  "radius": 1,
  "detail": 0
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a tetrahedron`,
    inlinable: true,
    inputs: [
      {
        name: "radius",
        type: "number",
        description: "Radius of the tetrahedron",
        required: false,
      },
      {
        name: "detail",
        type: "number",
        description:
          "Level of detail (0 = basic tetrahedron, higher values add more faces)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Tetrahedron geometry data in buffer format",
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
    detail: z.number().int().min(0).default(0),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = TetrahedronGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js TetrahedronGeometry
      const geometry = new TetrahedronGeometry(inputs.radius, inputs.detail);

      // Extract geometry data
      const positions = geometry.getAttribute("position");
      const normals = geometry.getAttribute("normal");
      const uvs = geometry.getAttribute("uv");
      const indices = geometry.getIndex();

      if (!positions || !normals) {
        return this.createErrorResult(
          "Failed to extract required geometry attributes"
        );
      }

      // Convert to the expected format
      const positionsArray = new Float32Array(positions.array);
      const normalsArray = new Float32Array(normals.array);

      // Handle indices - they might not exist, so create them if needed
      let indicesArray: Uint32Array;
      if (indices) {
        indicesArray = new Uint32Array(indices.array);
      } else {
        // Create sequential indices if they don't exist
        const vertexCount = positionsArray.length / 3;
        indicesArray = new Uint32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) {
          indicesArray[i] = i;
        }
      }

      // Handle UVs - they might not exist, so create default ones if needed
      let uvsArray: Float32Array;
      if (uvs) {
        uvsArray = new Float32Array(uvs.array);
      } else {
        // Create default UVs (all zeros) if they don't exist
        const vertexCount = positionsArray.length / 3;
        uvsArray = new Float32Array(vertexCount * 2);
        for (let i = 0; i < vertexCount; i++) {
          uvsArray[i * 2] = 0; // U coordinate
          uvsArray[i * 2 + 1] = 0; // V coordinate
        }
      }

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
          },
          detail: {
            level: inputs.detail,
            faces: this.getFaceCount(inputs.detail),
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create tetrahedron geometry: ${errorMessage}`
      );
    }
  }

  private getFaceCount(detail: number): number {
    // Tetrahedron has 4 faces, each detail level subdivides faces
    // This is a simplified calculation - actual face count depends on subdivision method
    return 4 * Math.pow(4, detail);
  }
}
