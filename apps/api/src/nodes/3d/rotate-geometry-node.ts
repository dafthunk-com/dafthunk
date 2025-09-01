import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  bufferToThreeGeometry,
  calculateBounds,
  threeGeometryToBuffer,
} from "./geometry-utils";

export class RotateGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "rotate-geometry",
    name: "Rotate Geometry",
    type: "rotate-geometry",
    description:
      "Rotates a BufferGeometry around X, Y, Z axes by specified angles",
    tags: ["3D"],
    icon: "rotate-cw",
    documentation: `Rotates a BufferGeometry around X, Y, Z axes by applying rotation angles in radians.

## Usage Example

**Input**: 
\`\`\`json
{
  "bufferGeometry": {
    "data": "[Uint8Array of BufferGeometry data]",
    "mimeType": "application/x-buffer-geometry"
  },
  "x": 1.5708,
  "y": 0.7854,
  "z": 0.5236
}
\`\`\`

**Output**: Rotated BufferGeometry with updated vertex positions

**Note**: Angles are specified in radians. Use Math.PI/2 for 90 degrees, Math.PI for 180 degrees, etc.`,
    inlinable: true,
    inputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Input BufferGeometry to rotate",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description: "Rotation angle around X-axis (in radians)",
        required: false,
      },
      {
        name: "y",
        type: "number",
        description: "Rotation angle around Y-axis (in radians)",
        required: false,
      },
      {
        name: "z",
        type: "number",
        description: "Rotation angle around Z-axis (in radians)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Rotated BufferGeometry data",
      },
      {
        name: "metadata",
        type: "json",
        description:
          "Rotation metadata (original bounds, new bounds, rotation angles)",
      },
    ],
  };

  private static readonly inputSchema = z.object({
    bufferGeometry: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.literal("application/x-buffer-geometry"),
    }),
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = RotateGeometryNode.inputSchema.parse(context.inputs);
      const { bufferGeometry, x, y, z } = inputs;

      // Convert to Three.js BufferGeometry
      const threeGeometry = bufferToThreeGeometry(bufferGeometry.data);

      // Calculate original bounds
      const positionAttribute = threeGeometry.getAttribute("position");
      const originalBounds = calculateBounds(
        new Float32Array(positionAttribute.array)
      );

      // Use Three.js native rotation methods
      // Apply rotations in order: X, Y, Z (this order matters for 3D transformations)
      if (x !== 0) {
        threeGeometry.rotateX(x);
      }
      if (y !== 0) {
        threeGeometry.rotateY(y);
      }
      if (z !== 0) {
        threeGeometry.rotateZ(z);
      }

      // Calculate new bounds
      const newBounds = calculateBounds(
        new Float32Array(positionAttribute.array)
      );

      // Convert back to our buffer format
      const rotatedBufferGeometry = threeGeometryToBuffer(threeGeometry);

      return this.createSuccessResult({
        bufferGeometry: {
          data: rotatedBufferGeometry,
          mimeType: "application/x-buffer-geometry",
        },
        metadata: {
          rotation: { x, y, z },
          originalBounds,
          newBounds,
          vertexCount: positionAttribute.count,
          triangleCount: threeGeometry.getIndex()
            ? threeGeometry.getIndex()!.count / 3
            : 0,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to rotate geometry: ${errorMessage}`
      );
    }
  }
}
