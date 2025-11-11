import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * BlobPreview node implementation
 * This node displays blob (binary) data and persists the reference for read-only execution views
 * The blob is passed through without modification - no double-save occurs
 */
export class BlobPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-blob",
    name: "Blob Preview",
    type: "preview-blob",
    description: "Display and preview binary blob data",
    tags: ["Widget", "Preview", "Blob"],
    icon: "file",
    documentation:
      "This node displays binary blob data in the workflow. The blob reference is persisted for viewing in read-only execution and deployed workflow views. No data is duplicated - the blob passes through unchanged.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "blob",
        description: "Binary blob to display",
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
