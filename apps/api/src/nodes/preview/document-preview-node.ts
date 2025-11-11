import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * DocumentPreview node implementation
 * This node displays document data and persists the reference for read-only execution views
 * The document is passed through without modification - no double-save occurs
 */
export class DocumentPreviewNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "preview-document",
    name: "Document Preview",
    type: "preview-document",
    description: "Display and preview document data",
    tags: ["Widget", "Preview", "Document"],
    icon: "file-text",
    documentation:
      "This node displays document data in the workflow. The document reference is persisted for viewing in read-only execution and deployed workflow views. No data is duplicated - the document passes through unchanged.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "document",
        description: "Document to display",
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
