import {
  type BlobParameter,
  ExecutableNode,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BlobToTextNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "blob-to-text",
    name: "Blob to Text",
    type: "blob-to-text",
    description: "Decode a blob to text content",
    tags: ["Data", "Blob", "Convert", "Text"],
    icon: "file-text",
    documentation:
      "This node decodes a blob containing text data and outputs it as a string. Supports any text-based content (plain text, HTML, CSV, XML, etc.).",
    inlinable: true,
    inputs: [
      {
        name: "blob",
        type: "blob",
        description: "The blob to decode as text",
        required: true,
      },
      {
        name: "encoding",
        type: "string",
        description: "Text encoding (utf-8, utf-16, etc.)",
        value: "utf-8",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "The decoded text content",
      },
      {
        name: "mimeType",
        type: "string",
        description: "The MIME type from the original blob",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { blob, encoding = "utf-8" } = context.inputs;

      if (!blob) {
        return this.createErrorResult("Blob is required");
      }

      // Validate that blob is a BlobParameter
      if (
        typeof blob !== "object" ||
        !(blob.data instanceof Uint8Array) ||
        typeof blob.mimeType !== "string"
      ) {
        return this.createErrorResult(
          "Invalid blob format. Expected BlobParameter with data and mimeType."
        );
      }

      const blobParam = blob as BlobParameter;

      // Decode the blob data to string
      let text: string;
      try {
        const textDecoder = new TextDecoder(encoding);
        text = textDecoder.decode(blobParam.data);
      } catch (decodeError) {
        return this.createErrorResult(
          `Failed to decode blob data: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
        );
      }

      return this.createSuccessResult({
        text,
        mimeType: blobParam.mimeType,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
