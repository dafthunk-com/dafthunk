import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * Webcam node implementation
 * This node provides a webcam widget that allows users to capture images and outputs them as base64 images.
 */
export class WebcamNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "webcam",
    name: "Webcam",
    type: "webcam",
    description: "A webcam widget for capturing images",
    category: "Widgets",
    icon: "camera",
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Current captured image as base64",
        hidden: true,
        value: "", // Default empty string
      },
      {
        name: "width",
        type: "number",
        description: "Image width in pixels",
        hidden: true,
        value: 640,
      },
      {
        name: "height",
        type: "number",
        description: "Image height in pixels",
        hidden: true,
        value: 480,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "The captured image as a base64 encoded image",
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

      const { value, width, height } = inputs;

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

      // Convert base64 directly to binary (value is already pure base64)
      const binaryString = atob(value);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return this.createSuccessResult({
        image: {
          data: bytes,
          type: "image/png",
        },
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
