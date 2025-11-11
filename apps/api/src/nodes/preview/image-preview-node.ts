import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * ImagePreview node implementation
 * This node displays image data and persists the reference for read-only execution views
 * The image is passed through without modification - no double-save occurs
 */
export class ImagePreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-image",
    name: "Image Preview",
    type: "preview-image",
    description: "Display and preview image data",
    tags: ["Widget", "Preview", "Image"],
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
    outputs: [],
  };

  async execute(_context: NodeContext): Promise<NodeExecution> {
    try {
      return this.createSuccessResult({});
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
