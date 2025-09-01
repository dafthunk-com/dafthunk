import { NodeExecution, NodeType } from "@dafthunk/types";
import { SphereGeometry } from "three/src/geometries/SphereGeometry.js";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import { createBufferGeometry } from "./geometry-utils";

export class SphereGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "sphere-geometry",
    name: "Sphere Geometry",
    type: "sphere-geometry",
    description:
      "Creates a Three.js SphereGeometry with configurable radius and segments",
    tags: ["3D"],
    icon: "circle",
    documentation: `Creates a sphere geometry using Three.js with configurable radius and segments.

## Usage Example

**Input**: 
\`\`\`json
{
  "radius": 1,
  "widthSegments": 32,
  "heightSegments": 16,
  "phiStart": 0,
  "phiLength": 6.283185307179586,
  "thetaStart": 0,
  "thetaLength": 3.141592653589793
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs for a sphere`,
    inlinable: true,
    inputs: [
      {
        name: "radius",
        type: "number",
        description: "Radius of the sphere",
        required: false,
      },
      {
        name: "widthSegments",
        type: "number",
        description: "Number of horizontal segments around the sphere",
        required: false,
      },
      {
        name: "heightSegments",
        type: "number",
        description: "Number of vertical segments around the sphere",
        required: false,
      },
      {
        name: "phiStart",
        type: "number",
        description: "Horizontal starting angle",
        required: false,
      },
      {
        name: "phiLength",
        type: "number",
        description: "Horizontal sweep angle size",
        required: false,
      },
      {
        name: "thetaStart",
        type: "number",
        description: "Vertical starting angle",
        required: false,
      },
      {
        name: "thetaLength",
        type: "number",
        description: "Vertical sweep angle size",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Sphere geometry data in buffer format",
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
    widthSegments: z.number().int().min(3).default(32),
    heightSegments: z.number().int().min(2).default(16),
    phiStart: z.number().default(0),
    phiLength: z.number().default(2 * Math.PI),
    thetaStart: z.number().default(0),
    thetaLength: z.number().default(Math.PI),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = SphereGeometryNode.inputSchema.parse(context.inputs);

      // Create Three.js SphereGeometry
      const geometry = new SphereGeometry(
        inputs.radius,
        inputs.widthSegments,
        inputs.heightSegments,
        inputs.phiStart,
        inputs.phiLength,
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
          },
          segments: {
            width: inputs.widthSegments,
            height: inputs.heightSegments,
          },
          angles: {
            phiStart: inputs.phiStart,
            phiLength: inputs.phiLength,
            thetaStart: inputs.thetaStart,
            thetaLength: inputs.thetaLength,
            isFullSphere: this.isFullSphere(inputs),
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to create sphere geometry: ${errorMessage}`
      );
    }
  }

  private isFullSphere(inputs: {
    phiStart: number;
    phiLength: number;
    thetaStart: number;
    thetaLength: number;
  }): boolean {
    const isFullPhi = Math.abs(inputs.phiLength - 2 * Math.PI) < 0.001;
    const isFullTheta = Math.abs(inputs.thetaLength - Math.PI) < 0.001;
    const isStartPhi = Math.abs(inputs.phiStart) < 0.001;
    const isStartTheta = Math.abs(inputs.thetaStart) < 0.001;

    return isFullPhi && isFullTheta && isStartPhi && isStartTheta;
  }
}
