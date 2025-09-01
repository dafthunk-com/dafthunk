import { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";
import {
  bufferToThreeGeometry,
  calculateBounds,
  threeGeometryToBuffer,
} from "./geometry-utils";

export class TranslateGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "translate-geometry",
    name: "Translate Geometry",
    type: "translate-geometry",
    description: "Translates a BufferGeometry by specified X, Y, Z offsets",
    tags: ["3D"],
    icon: "move",
    documentation: `Translates a BufferGeometry by applying X, Y, Z translation offsets to all vertices.

## Usage Example

**Input**: 
\`\`\`json
{
  "bufferGeometry": {
    "data": "[Uint8Array of BufferGeometry data]",
    "mimeType": "application/x-buffer-geometry"
  },
  "x": 1.0,
  "y": 0.5,
  "z": -2.0
}
\`\`\`

**Output**: Translated BufferGeometry with updated vertex positions`,
    inlinable: true,
    inputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Input BufferGeometry to translate",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description: "Translation offset along X-axis",
        required: false,
      },
      {
        name: "y",
        type: "number",
        description: "Translation offset along Y-axis",
        required: false,
      },
      {
        name: "z",
        type: "number",
        description: "Translation offset along Z-axis",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "Translated BufferGeometry data",
      },
      {
        name: "metadata",
        type: "json",
        description:
          "Translation metadata (original bounds, new bounds, translation vector)",
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
      const inputs = TranslateGeometryNode.inputSchema.parse(context.inputs);
      const { bufferGeometry, x, y, z } = inputs;

      // Convert to Three.js BufferGeometry
      const threeGeometry = bufferToThreeGeometry(bufferGeometry.data);

      // Calculate original bounds
      const positionAttribute = threeGeometry.getAttribute("position");
      const originalBounds = calculateBounds(
        new Float32Array(positionAttribute.array)
      );

      // Use Three.js native translate method
      threeGeometry.translate(x, y, z);

      // Calculate new bounds
      const newBounds = calculateBounds(
        new Float32Array(positionAttribute.array)
      );

      // Convert back to our buffer format
      const translatedBufferGeometry = threeGeometryToBuffer(threeGeometry);

      return this.createSuccessResult({
        bufferGeometry: {
          data: translatedBufferGeometry,
          mimeType: "application/x-buffer-geometry",
        },
        metadata: {
          translation: { x, y, z },
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
        `Failed to translate geometry: ${errorMessage}`
      );
    }
  }
}
