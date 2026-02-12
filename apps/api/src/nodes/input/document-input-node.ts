import type { NodeExecution, NodeType } from "@dafthunk/types";

import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";

/**
 * DocumentInput node implementation
 * This node provides a document input widget that outputs a document reference.
 */
export class DocumentInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "document-input",
    name: "Document Input",
    type: "document-input",
    description: "A document input widget for uploading documents",
    tags: ["Widget", "Document", "Input", "PDF"],
    icon: "file-text",
    documentation:
      "This node provides a document input widget for uploading documents like PDFs, Word docs, etc.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "document",
        description: "Current document value",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "document",
        description: "The uploaded document",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value;

      if (!value) {
        return this.createErrorResult("No document provided");
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
