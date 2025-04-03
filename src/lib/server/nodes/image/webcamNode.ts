import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { ImageValue, NumberValue } from "../types";
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
        value: new ImageValue(null),
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
      const { value } = context.inputs;

      // If no value is provided, fail
      if (!value) {
        return this.createErrorResult(
          "No image data provided"
        );
      }

      // If value is already an ImageValue, check if it contains data
      if (value instanceof ImageValue) {
        if (!value.getValue()) {
          return this.createErrorResult(
            "Image value is empty"
          );
        }
        return this.createSuccessResult({
          image: value,
        });
      }

      // Handle raw input values
      if (typeof value === "object") {
        // Convert raw object to ImageValue
        return this.createSuccessResult({
          image: new ImageValue(value),
        });
      }

      // If we get here, the input is invalid
      return this.createErrorResult(
        "Invalid input: expected an image value object"
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
