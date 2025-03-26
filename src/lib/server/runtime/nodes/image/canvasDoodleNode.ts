import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../runtimeTypes";

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
    category: "Image",
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
      },
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
      console.log("Received input:", context.inputs.value); // Debug log

      let inputs;
      try {
        if (typeof context.inputs.value !== "string") {
          return this.createErrorResult(
            `Invalid input type: expected string, got ${typeof context.inputs.value}`
          );
        }
        inputs = JSON.parse(context.inputs.value);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown parsing error";
        return this.createErrorResult(
          `Invalid input format: expected JSON string. Error: ${errorMessage}`
        );
      }

      const { value, width, height, strokeColor, strokeWidth } = inputs;

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

      // Convert base64 directly to binary (value is already pure base64)
      const binaryString = atob(value);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create properly structured image output
      const imageOutput = {
        data: bytes,
        mimeType: "image/png",
      };

      return this.createSuccessResult({
        image: imageOutput,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
