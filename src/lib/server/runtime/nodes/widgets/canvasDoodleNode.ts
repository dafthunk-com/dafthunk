import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * CanvasDoodle node implementation
 * This node provides a canvas widget that allows users to draw and outputs the drawing as a base64 image.
 */
export class CanvasDoodleNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "canvas-doodle",
    name: "Canvas Doodle",
    type: "canvas-doodle",
    description: "A canvas widget for drawing and sketching",
    category: "Widgets",
    icon: "pencil",
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Current canvas drawing as base64 image",
        hidden: true,
        value: "", // Default empty string
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
      }
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The canvas drawing as a base64 encoded image",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const value = context.inputs.value as string;
      const width = context.inputs.width as number;
      const height = context.inputs.height as number;
      const strokeColor = context.inputs.strokeColor as string;
      const strokeWidth = context.inputs.strokeWidth as number;

      // Validate inputs
      if (typeof value !== "string") {
        return this.createErrorResult("Value must be a string");
      }

      if (typeof width !== "number" || width < 1) {
        return this.createErrorResult("Width must be a positive number");
      }

      if (typeof height !== "number" || height < 1) {
        return this.createErrorResult("Height must be a positive number");
      }

      if (typeof strokeColor !== "string") {
        return this.createErrorResult("Stroke color must be a string");
      }

      if (typeof strokeWidth !== "number" || strokeWidth < 1) {
        return this.createErrorResult("Stroke width must be a positive number");
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