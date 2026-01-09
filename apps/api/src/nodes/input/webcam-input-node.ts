import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

/**
 * Webcam node implementation
 * This node provides a webcam widget that allows users to capture images and outputs them as an image reference.
 */
export class WebcamInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "webcam-input",
    name: "Webcam Input",
    type: "webcam-input",
    description: "A webcam widget for capturing images",
    tags: ["Widget", "Image", "Webcam", "Capture"],
    icon: "camera",
    documentation:
      "This node provides a webcam widget that allows users to capture images and outputs them as an image reference.",
    inputs: [
      {
        name: "value",
        type: "image",
        description: "Current captured image as an image reference",
        hidden: true,
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
        description: "The captured image as an image reference",
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

      // Handle raw input values
      if (typeof value === "object") {
        // Convert raw object to ImageValue
        return this.createSuccessResult({
          image: value,
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
