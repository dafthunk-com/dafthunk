import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { ImageValue, StringValue, NumberValue } from "../types";
import { NodeType } from "../types";

/**
 * Webcam node implementation
 * This node provides a webcam widget that allows users to capture images and outputs them as an image reference.
 */
export class WebcamNode extends ExecutableNode {
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
        type: ImageValue,
        description: "Current captured image as an image reference",
        hidden: true,
        value: new ImageValue({ data: new Uint8Array(0), mimeType: "image/png" }),
      },
      {
        name: "width",
        type: NumberValue,
        description: "Image width in pixels",
        hidden: true,
        value: new NumberValue(640),
      },
      {
        name: "height",
        type: NumberValue,
        description: "Image height in pixels",
        hidden: true,
        value: new NumberValue(480),
      },
    ],
    outputs: [
      {
        name: "image",
        type: ImageValue,
        description: "The captured image as an image reference",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      // Get the raw value from the RuntimeParameterValue
      const value = context.inputs.value?.getValue?.() ?? context.inputs.value;
      
      // If no value is provided, return an empty image
      if (!value) {
        return this.createSuccessResult({
          image: new ImageValue({ data: new Uint8Array(0), mimeType: "image/png" }),
        });
      }

      // Check if the value is an object
      if (typeof value !== 'object') {
        return this.createErrorResult(
          `Invalid input type: expected object, got ${typeof value}`
        );
      }

      // Pass the value directly to the ImageValue constructor
      // The ImageValue class will validate the value format
      return this.createSuccessResult({
        image: new ImageValue(value),
      });
    } catch (error) {
      // Return a clean error message without logging
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error in WebcamNode"
      );
    }
  }
}
