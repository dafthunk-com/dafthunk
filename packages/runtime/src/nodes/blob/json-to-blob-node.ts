import {
  type BlobParameter,
  ExecutableNode,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class JsonToBlobNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-to-blob",
    name: "JSON to Blob",
    type: "json-to-blob",
    description: "Convert JSON data to a blob with application/json MIME type",
    tags: ["Data", "JSON", "Blob", "Convert"],
    icon: "file-json",
    documentation:
      "This node converts JSON data to a blob with application/json MIME type. Useful for creating HTTP request bodies or storing JSON as binary data.",
    inlinable: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON data to convert to a blob",
        required: true,
      },
      {
        name: "mimeType",
        type: "string",
        description: "MIME type for the blob",
        value: "application/json",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "blob",
        type: "blob",
        description: "The JSON data as a blob with application/json MIME type",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json, mimeType = "application/json" } = context.inputs;

      if (json === undefined || json === null) {
        return this.createErrorResult("JSON data is required");
      }

      // Stringify the JSON data
      let jsonString: string;
      try {
        jsonString = JSON.stringify(json);
      } catch (stringifyError) {
        return this.createErrorResult(
          `Failed to stringify JSON: ${stringifyError instanceof Error ? stringifyError.message : String(stringifyError)}`
        );
      }

      // Convert to Uint8Array
      const textEncoder = new TextEncoder();
      const data = textEncoder.encode(jsonString);

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
