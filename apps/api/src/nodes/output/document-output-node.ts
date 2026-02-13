import {
  DocumentParameter,
  ExecutableNode,
  NodeContext,
} from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * DocumentOutput node implementation
 * This node displays document data and persists the reference for read-only execution views
 * The document is passed through without modification - no double-save occurs
 */
export class DocumentOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-document",
    name: "Document Output",
    type: "output-document",
    description: "Display and preview document data",
    tags: ["Widget", "Output", "Document"],
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
    outputs: [
      {
        name: "displayValue",
        type: "document",
        description: "Persisted document reference for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as DocumentParameter | undefined;

      // Validate if provided
      if (value !== undefined) {
        if (
          typeof value !== "object" ||
          !(value.data instanceof Uint8Array) ||
          typeof value.mimeType !== "string"
        ) {
          return this.createErrorResult(
            "Value must be a valid document with data and mimeType"
          );
        }
      }

      // Store document reference in output for persistence - no transformation
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
