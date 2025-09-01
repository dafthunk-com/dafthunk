import { NodeExecution, NodeType } from "@dafthunk/types";
import { TorusKnotGeometry } from "three/src/geometries/TorusKnotGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class TorusKnotGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "torus-knot-geometry",
    name: "Torus Knot Geometry",
    type: "torus-knot-geometry",
    description:
      "Creates a Three.js TorusKnotGeometry with configurable radius, tube, and knot parameters",
    tags: ["3D"],
    icon: "infinity",
    documentation: `Creates a torus knot geometry using Three.js with configurable radius, tube, and knot parameters.

## Usage Example

**Input**: 
\`\`\`json
{
  "radius": 1,
  "tube": 0.3,
  "tubularSegments": 64,
  "radialSegments": 8,
  "p": 2,
  "q": 3
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a torus knot`,
    inlinable: true,
    inputs: [
      {
        name: "radius",
        type: "number",
        description: "Radius of the torus",
        required: false,
      },
      {
        name: "tube",
        type: "number",
        description: "Radius of the tube",
        required: false,
      },
      {
        name: "tubularSegments",
        type: "number",
        description: "Number of segments along the tube",
        required: false,
      },
      {
        name: "radialSegments",
        type: "number",
        description: "Number of segments around the tube",
        required: false,
      },
      {
        name: "p",
        type: "number",
        description: "Number of windings around the torus",
        required: false,
      },
      {
        name: "q",
        type: "number",
        description: "Number of windings around the tube",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Torus knot geometry data in buffer format",
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
    tube: z.number().positive().default(0.3),
    tubularSegments: z.number().int().positive().default(64),
    radialSegments: z.number().int().positive().default(8),
    p: z.number().int().positive().default(2),
    q: z.number().int().positive().default(3),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = TorusKnotGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js TorusKnotGeometry
      const geometry = new TorusKnotGeometry(
        inputs.radius,
        inputs.tube,
        inputs.tubularSegments,
        inputs.radialSegments,
        inputs.p,
        inputs.q
      );

      // Debug geometry creation
      if (!geometry) {
        return this.createErrorResult("Failed to create TorusKnotGeometry");
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
            radius: inputs.radius,
            tube: inputs.tube,
            tubularSegments: inputs.tubularSegments,
            radialSegments: inputs.radialSegments,
            p: inputs.p,
            q: inputs.q,
            knotType: this.getKnotType(inputs.p, inputs.q),
            complexity: this.calculateComplexity(inputs.p, inputs.q),
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create torus knot geometry: ${errorMessage}`
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

  private getKnotType(p: number, q: number): string {
    // Common torus knot types based on p and q values
    if (p === 2 && q === 3) return "Trefoil";
    if (p === 3 && q === 2) return "Trefoil";
    if (p === 2 && q === 5) return "Cinquefoil";
    if (p === 5 && q === 2) return "Cinquefoil";
    if (p === 3 && q === 4) return "Solomon's Seal";
    if (p === 4 && q === 3) return "Solomon's Seal";
    if (p === 3 && q === 5) return "Septafoil";
    if (p === 5 && q === 3) return "Septafoil";
    if (p === 2 && q === 7) return "Septafoil";
    if (p === 7 && q === 2) return "Septafoil";
    if (p === 3 && q === 7) return "Nonafoil";
    if (p === 7 && q === 3) return "Nonafoil";
    if (p === 4 && q === 5) return "Decafoil";
    if (p === 5 && q === 4) return "Decafoil";
    return `Custom (${p},${q})`;
  }

  private calculateComplexity(p: number, q: number): string {
    const gcd = this.greatestCommonDivisor(p, q);
    const complexity = (p * q) / gcd;

    if (complexity <= 6) return "Simple";
    if (complexity <= 12) return "Medium";
    if (complexity <= 24) return "Complex";
    return "Very Complex";
  }

  private greatestCommonDivisor(a: number, b: number): number {
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
}
