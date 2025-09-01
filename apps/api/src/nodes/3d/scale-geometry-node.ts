import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  bufferToThreeGeometry,
  calculateBounds,
  threeGeometryToBuffer,
} from "./geometry-utils";

export class ScaleGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "scale-geometry",
    name: "Scale Geometry",
    type: "scale-geometry",
    description: "Scales a BufferGeometry by specified X, Y, Z scale factors",
    tags: ["3D"],
    icon: "expand",
    documentation: `Scales a BufferGeometry by applying X, Y, Z scale factors to all vertices.

## Usage Example

**Input**: 
\`\`\`json
{
  "bufferGeometry": {
    "data": "[Uint8Array of BufferGeometry data]",
    "mimeType": "application/x-buffer-geometry"
  },
  "x": 2.0,
  "y": 1.5,
  "z": 0.5
}
\`\`\`

**Output**: Scaled BufferGeometry with updated vertex positions`,
    inlinable: true,
    inputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Input BufferGeometry to scale",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description: "Scale factor along X-axis",
        required: false,
      },
      {
        name: "y",
        type: "number",
        description: "Scale factor along Y-axis",
        required: false,
      },
      {
        name: "z",
        type: "number",
        description: "Scale factor along Z-axis",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Scaled BufferGeometry data",
      },
      {
        name: "metadata",
        type: "json",
        description:
          "Scaling metadata (original bounds, new bounds, scale factors)",
      },
    ],
  };

  private static readonly inputSchema = z.object({
    bufferGeometry: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.literal("application/x-buffer-geometry"),
    }),
    x: z.number().positive().default(1),
    y: z.number().positive().default(1),
    z: z.number().positive().default(1),
  });

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const inputs = ScaleGeometryNode.inputSchema.parse(context.inputs);
      const { bufferGeometry, x, y, z } = inputs;

      // Convert to Three.js BufferGeometry
      const threeGeometry = bufferToThreeGeometry(bufferGeometry.data);

      // Calculate original bounds
      const positionAttribute = threeGeometry.getAttribute("position");
      const originalBounds = calculateBounds(
        new Float32Array(positionAttribute.array)
      );

      // Use Three.js native scale method
      threeGeometry.scale(x, y, z);

      // Calculate new bounds
      const newBounds = calculateBounds(
        new Float32Array(positionAttribute.array)
      );

      // Convert back to our buffer format
      const scaledBufferGeometry = threeGeometryToBuffer(threeGeometry);

      return this.createSuccessResult({
        bufferGeometry: {
          data: scaledBufferGeometry,
          mimeType: "application/x-buffer-geometry",
        },
        metadata: {
          scale: { x, y, z },
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
        `Failed to scale geometry: ${errorMessage}`
      );
    }
  }
}
