import {
  type BlobParameter,
  ExecutableNode,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * BlobOutput node implementation
 * This node displays blob (binary) data and persists the reference for read-only execution views
 * The blob is passed through without modification - no double-save occurs
 */
export class BlobOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-blob",
    name: "Blob Output",
    type: "output-blob",
    description: "Display and preview binary blob data",
    tags: ["Widget", "Output", "Blob"],
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
    outputs: [
      {
        name: "displayValue",
        type: "blob",
        description: "Persisted blob reference for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as BlobParameter | undefined;

      // Validate if provided
      if (value !== undefined) {
        if (
          typeof value !== "object" ||
          !(value.data instanceof Uint8Array) ||
          typeof value.mimeType !== "string"
        ) {
          return this.createErrorResult(
            "Value must be a valid blob with data and mimeType"
          );
        }
      }

      // Store blob reference in output for persistence - no transformation
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
