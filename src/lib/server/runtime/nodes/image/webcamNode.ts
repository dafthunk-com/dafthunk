import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../types";
import {
  ImageNodeParameter,
  StringNodeParameter,
  NumberNodeParameter,
} from "../nodeParameterTypes";
import { NodeType } from "../nodeTypes";

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
    category: "Image",
    icon: "camera",
    inputs: [
      {
        name: "value",
        type: StringNodeParameter,
        description: "Current captured image as base64",
        hidden: true,
        value: new StringNodeParameter(""), // Default empty string
      },
      {
        name: "width",
        type: NumberNodeParameter,
        description: "Image width in pixels",
        hidden: true,
        value: new NumberNodeParameter(640),
      },
      {
        name: "height",
        type: NumberNodeParameter,
        description: "Image height in pixels",
        hidden: true,
        value: new NumberNodeParameter(480),
      },
    ],
    outputs: [
      {
        name: "image",
        type: ImageNodeParameter,
        description: "The captured image as a base64 encoded image",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
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

      // Create properly structured image output
      const imageOutput = {
        data: bytes,
        mimeType: "image/png",
      };

      // Validate the output structure
      if (!imageOutput.data || !imageOutput.mimeType) {
        throw new Error("Invalid image output structure");
      }

      return this.createSuccessResult({
        image: new ImageNodeParameter(imageOutput),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
