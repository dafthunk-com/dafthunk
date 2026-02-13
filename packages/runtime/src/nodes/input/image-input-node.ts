import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * ImageInput node implementation
 * This node provides an image input widget that outputs an image reference.
 */
export class ImageInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "image-input",
    name: "Image Input",
    type: "image-input",
    description: "An image input widget for uploading images",
    tags: ["Widget", "Image", "Input"],
    icon: "image",
    documentation:
      "This node provides an image input widget for uploading images.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "image",
        description: "Current image value",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "image",
        description: "The uploaded image",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value;

      if (!value) {
        return this.createErrorResult("No image provided");
      }

      return this.createSuccessResult({
        value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
