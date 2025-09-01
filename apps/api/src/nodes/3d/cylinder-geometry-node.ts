import { NodeExecution, NodeType } from "@dafthunk/types";
import { CylinderGeometry } from "three/src/geometries/CylinderGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class CylinderGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cylinder-geometry",
    name: "Cylinder Geometry",
    type: "cylinder-geometry",
    description:
      "Creates a Three.js CylinderGeometry with configurable radius and height",
    tags: ["3D"],
    icon: "circle",
    documentation: `Creates a cylinder geometry using Three.js with configurable radius, height, and segments.

## Usage Example

**Input**: 
\`\`\`json
{
  "radiusTop": 1,
  "radiusBottom": 1,
  "height": 2,
  "radialSegments": 8,
  "heightSegments": 1
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a cylinder`,
    inlinable: true,
    inputs: [
      {
        name: "radiusTop",
        type: "number",
        description: "Radius of the cylinder at the top",
        required: false,
      },
      {
        name: "radiusBottom",
        type: "number",
        description: "Radius of the cylinder at the bottom",
        required: false,
      },
      {
        name: "height",
        type: "number",
        description: "Height of the cylinder",
        required: false,
      },
      {
        name: "radialSegments",
        type: "number",
        description: "Number of segments around the circumference",
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
        description: "Cylinder geometry data in buffer format",
      },
      {
        name: "metadata",
        type: "json",
        description: "Geometry metadata (vertex count, dimensions)",
      },
    ],
  };

  private static readonly inputSchema = z.object({
    radiusTop: z.number().positive().default(1),
    radiusBottom: z.number().positive().default(1),
    height: z.number().positive().default(1),
    radialSegments: z.number().int().min(3).default(8),
    heightSegments: z.number().int().min(1).default(1),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = CylinderGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js CylinderGeometry
      const geometry = new CylinderGeometry(
        inputs.radiusTop,
        inputs.radiusBottom,
        inputs.height,
        inputs.radialSegments,
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
            radiusTop: inputs.radiusTop,
            radiusBottom: inputs.radiusBottom,
            height: inputs.height,
            diameterTop: inputs.radiusTop * 2,
            diameterBottom: inputs.radiusBottom * 2,
          },
          segments: {
            radialSegments: inputs.radialSegments,
            heightSegments: inputs.heightSegments,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create cylinder geometry: ${errorMessage}`
      );
    }
  }
}
