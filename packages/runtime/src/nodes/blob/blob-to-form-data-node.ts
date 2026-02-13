import {
  type BlobParameter,
  ExecutableNode,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BlobToFormDataNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "blob-to-form-data",
    name: "Blob to Form Data",
    type: "blob-to-form-data",
    description: "Parse a blob as URL-encoded form data",
    tags: ["Data", "Blob", "Convert", "Form"],
    icon: "file-input",
    documentation:
      "This node parses a blob containing URL-encoded form data (application/x-www-form-urlencoded) and outputs the parsed key-value pairs as a JSON object. Values are automatically converted to appropriate types (boolean, number) when possible.",
    inlinable: true,
    inputs: [
      {
        name: "blob",
        type: "blob",
        description: "The blob to parse as form data",
        required: true,
      },
    ],
    outputs: [
      {
        name: "formData",
        type: "json",
        description: "The parsed form data as a JSON object",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { blob } = context.inputs;

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
      let formString: string;
      try {
        const textDecoder = new TextDecoder();
        formString = textDecoder.decode(blobParam.data);
      } catch (decodeError) {
        return this.createErrorResult(
          `Failed to decode blob data: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
        );
      }

      // Parse URL-encoded form data
      const formData: Record<string, string | number | boolean> = {};
      try {
        const params = new URLSearchParams(formString);
        for (const [key, value] of params.entries()) {
          // Try to convert to appropriate type
          formData[key] = this.parseValue(value);
        }
      } catch (parseError) {
        return this.createErrorResult(
          `Failed to parse form data: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }

      return this.createSuccessResult({
        formData,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Parse a string value to its appropriate type (boolean, number, or string)
   */
  private parseValue(value: string): string | number | boolean {
    // Check for boolean
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;

    // Check for number
    if (value !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }

    // Return as string
    return value;
  }
}
