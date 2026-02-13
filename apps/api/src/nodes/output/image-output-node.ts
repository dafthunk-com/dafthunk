import { ExecutableNode, ImageParameter, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * ImageOutput node implementation
 * This node displays image data and persists the reference for read-only execution views
 * The image is passed through without modification - no double-save occurs
 */
export class ImageOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-image",
    name: "Image Output",
    type: "output-image",
    description: "Display and preview image data",
    tags: ["Widget", "Output", "Image"],
    icon: "image",
    documentation:
      "This node displays image data in the workflow. The image reference is persisted for viewing in read-only execution and deployed workflow views. No data is duplicated - the image passes through unchanged.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "image",
        description: "Image to display",
        required: true,
      },
    ],
    outputs: [
      {
        name: "displayValue",
        type: "image",
        description: "Persisted image reference for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as ImageParameter | undefined;

      // Validate if provided
      if (value !== undefined) {
        if (
          typeof value !== "object" ||
          !(value.data instanceof Uint8Array) ||
          typeof value.mimeType !== "string"
        ) {
          return this.createErrorResult(
            "Value must be a valid image with data and mimeType"
          );
        }

        // Validate MIME type is image-related
        if (!value.mimeType.startsWith("image/")) {
          return this.createErrorResult(
            "MIME type must be image-related (e.g., image/png, image/jpeg)"
          );
        }
      }

      // Store image reference in output for persistence - no transformation
      return this.createSuccessResult({
        displayValue: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
