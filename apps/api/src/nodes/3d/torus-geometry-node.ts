import { NodeExecution, NodeType } from "@dafthunk/types";
import { TorusGeometry } from "three/src/geometries/TorusGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class TorusGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "torus-geometry",
    name: "Torus Geometry",
    type: "torus-geometry",
    description:
      "Creates a Three.js TorusGeometry with configurable radius, tube, and segments",
    tags: ["3D"],
    icon: "circle",
    documentation: `Creates a torus (donut) geometry using Three.js with configurable radius, tube thickness, and segments.

## Usage Example

**Input**: 
\`\`\`json
{
  "radius": 1,
  "tube": 0.4,
  "radialSegments": 16,
  "tubularSegments": 32,
  "arc": 6.283185307179586
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a torus`,
    inlinable: true,
    inputs: [
      {
        name: "radius",
        type: "number",
        description: "Radius of the torus from the center to the tube center",
        required: false,
      },
      {
        name: "tube",
        type: "number",
        description: "Radius of the tube (thickness of the torus)",
        required: false,
      },
      {
        name: "radialSegments",
        type: "number",
        description: "Number of segments around the tube circumference",
        required: false,
      },
      {
        name: "tubularSegments",
        type: "number",
        description: "Number of segments around the torus circumference",
        required: false,
      },
      {
        name: "arc",
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
        description: "Torus geometry data in buffer format",
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
    tube: z.number().positive().default(0.4),
    radialSegments: z.number().int().min(3).default(16),
    tubularSegments: z.number().int().min(3).default(32),
    arc: z.number().default(2 * Math.PI),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = TorusGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js TorusGeometry
      const geometry = new TorusGeometry(
        inputs.radius,
        inputs.tube,
        inputs.radialSegments,
        inputs.tubularSegments,
        inputs.arc
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
            tube: inputs.tube,
            outerRadius: inputs.radius + inputs.tube,
            innerRadius: inputs.radius - inputs.tube,
          },
          segments: {
            radial: inputs.radialSegments,
            tubular: inputs.tubularSegments,
          },
          arc: {
            angle: inputs.arc,
            isFullCircle: Math.abs(inputs.arc - 2 * Math.PI) < 0.001,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create torus geometry: ${errorMessage}`
      );
    }
  }
}
