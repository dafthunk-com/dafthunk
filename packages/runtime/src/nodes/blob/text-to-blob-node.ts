import {
  type BlobParameter,
  ExecutableNode,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class TextToBlobNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "text-to-blob",
    name: "Text to Blob",
    type: "text-to-blob",
    description: "Convert text content to a blob with specified MIME type",
    tags: ["Data", "Blob", "Convert", "Text"],
    icon: "file-text",
    documentation:
      "This node converts text content to a blob with a specified MIME type. Useful for creating HTTP request bodies, files, or storing text as binary data with custom content types.",
    inlinable: true,
    inputs: [
      {
        name: "text",
        type: "string",
        description: "The text content to convert to a blob",
        required: true,
      },
      {
        name: "mimeType",
        type: "string",
        description:
          "MIME type for the blob (e.g., text/plain, text/html, text/csv)",
        value: "text/plain",
        required: true,
      },
    ],
    outputs: [
      {
        name: "blob",
        type: "blob",
        description: "The text content as a blob with the specified MIME type",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { text, mimeType = "text/plain" } = context.inputs;

      if (text === undefined || text === null) {
        return this.createErrorResult("Text content is required");
      }

      if (typeof text !== "string") {
        return this.createErrorResult("Text must be a string");
      }

      if (!mimeType || typeof mimeType !== "string") {
        return this.createErrorResult(
          "MIME type is required and must be a string"
        );
      }

      // Convert text to Uint8Array
      const textEncoder = new TextEncoder();
      const data = textEncoder.encode(text);

      // Create BlobParameter
      const blob: BlobParameter = {
        data,
        mimeType,
      };

      return this.createSuccessResult({
        blob,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
