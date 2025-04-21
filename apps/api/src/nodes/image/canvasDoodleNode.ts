import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
import { NodeType, NodeExecution } from "../../types";

/**
 * CanvasDoodle node implementation
 * This node provides a canvas widget that allows users to draw and outputs the drawing as an image.
 */
export class CanvasDoodleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "canvas-doodle",
    name: "Canvas Doodle",
    type: "canvas-doodle",
    description: "A canvas widget for drawing and sketching",
    category: "Image",
    icon: "pencil",
    inputs: [
      {
        name: "value",
        type: "image",
        description: "Current canvas drawing as an image reference",
        hidden: true,
      },
      {
        name: "width",
        type: "number",
        description: "Canvas width in pixels",
        hidden: true,
        value: 300,
      },
      {
        name: "height",
        type: "number",
        description: "Canvas height in pixels",
        hidden: true,
        value: 300,
      },
      {
        name: "strokeColor",
        type: "string",
        description: "Color of the drawing stroke",
        hidden: true,
        value: "#000000",
      },
      {
        name: "strokeWidth",
        type: "number",
        description: "Width of the drawing stroke",
        hidden: true,
        value: 2,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The canvas drawing as an image",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value } = context.inputs;

      // If no value is provided, fail
      if (!value) {
        return this.createErrorResult("No image data provided");
      }

      return this.createSuccessResult({
        image: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
