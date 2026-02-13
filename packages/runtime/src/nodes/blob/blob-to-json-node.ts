import {
  type BlobParameter,
  ExecutableNode,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BlobToJsonNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "blob-to-json",
    name: "Blob to JSON",
    type: "blob-to-json",
    description: "Parse a blob as JSON and extract the data",
    tags: ["Data", "Blob", "Convert", "JSON"],
    icon: "file-json",
    documentation:
      "This node parses a blob containing JSON data and outputs the parsed JSON object. The blob is expected to contain valid JSON text data.",
    inlinable: true,
    inputs: [
      {
        name: "blob",
        type: "blob",
        description: "The blob to parse as JSON",
        required: true,
      },
    ],
    outputs: [
      {
        name: "json",
        type: "json",
        description: "The parsed JSON data",
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
      let jsonString: string;
      try {
        const textDecoder = new TextDecoder();
        jsonString = textDecoder.decode(blobParam.data);
      } catch (decodeError) {
        return this.createErrorResult(
          `Failed to decode blob data: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
        );
      }

      // Parse the JSON string
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(jsonString);
      } catch (parseError) {
        return this.createErrorResult(
          `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }

      return this.createSuccessResult({
        json: parsedJson,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
