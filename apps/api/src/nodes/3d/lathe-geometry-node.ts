import { NodeExecution, NodeType } from "@dafthunk/types";
import { LatheGeometry } from "three/src/geometries/LatheGeometry.js";
import { Vector2 } from "three/src/math/Vector2.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class LatheGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "lathe-geometry",
    name: "Lathe Geometry",
    type: "lathe-geometry",
    description:
      "Creates a Three.js LatheGeometry by rotating a 2D shape around the Y axis",
    tags: ["3D"],
    icon: "rotate-cw",
    documentation: `Creates a lathe geometry using Three.js by rotating a 2D shape around the Y axis.

## Usage Example

**Input**: 
\`\`\`json
{
  "points": [[0, 0], [0.5, 0.5], [1, 0]],
  "segments": 12,
  "phiStart": 0,
  "phiLength": 6.283185307179586
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a lathed shape`,
    inlinable: true,
    inputs: [
      {
        name: "points",
        type: "json",
        description:
          "Array of 2D points to rotate around Y axis (each point as [x, y])",
        required: true,
      },
      {
        name: "segments",
        type: "number",
        description: "Number of segments around the circumference",
        required: false,
      },
      {
        name: "phiStart",
        type: "number",
        description: "Starting angle in radians",
        required: false,
      },
      {
        name: "phiLength",
        type: "number",
        description: "Length of the arc in radians",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Lathe geometry data in buffer format",
      },
      {
        name: "metadata",
        type: "json",
        description: "Geometry metadata (vertex count, dimensions)",
      },
    ],
  };

  private static readonly inputSchema = z.object({
    points: z.array(z.tuple([z.number(), z.number()])).min(2),
    segments: z.number().int().positive().default(12),
    phiStart: z.number().default(0),
    phiLength: z
      .number()
      .positive()
      .default(2 * Math.PI),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = LatheGeometryNode.inputSchema.parse(context.inputs);

      // Convert points to Vector2 objects
      const vector2Points = inputs.points.map(
        (point) => new Vector2(point[0], point[1])
      );

      // Create Three.js LatheGeometry
      const geometry = new LatheGeometry(
        vector2Points,
        inputs.segments,
        inputs.phiStart,
        inputs.phiLength
      );

      // Debug geometry creation
      if (!geometry) {
        return this.createErrorResult("Failed to create LatheGeometry");
      }

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

      // Calculate bounding box for dimensions
      const bounds = this.calculateBounds(positionsArray);

      return this.createSuccessResult({
        bufferGeometry: {
          data: bufferGeometry,
          mimeType: "application/x-buffer-geometry",
        },
        metadata: {
          vertexCount,
          triangleCount,
          dimensions: {
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY,
            depth: bounds.maxZ - bounds.minZ,
            center: {
              x: (bounds.maxX + bounds.minX) / 2,
              y: (bounds.maxY + bounds.minY) / 2,
              z: (bounds.maxZ + bounds.minZ) / 2,
            },
          },
          parameters: {
            pointCount: inputs.points.length,
            segments: inputs.segments,
            phiStart: inputs.phiStart,
            phiLength: inputs.phiLength,
            isFullCircle: Math.abs(inputs.phiLength - 2 * Math.PI) < 0.001,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create lathe geometry: ${errorMessage}`
      );
    }
  }

  private calculateBounds(positions: Float32Array): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  } {
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
  }
}
