import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../runtimeTypes";

/**
 * Document node implementation
 * This node provides a document widget that allows users to upload documents and outputs them as binary data.
 */
export class DocumentNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "document",
    name: "Document",
    type: "document",
    description: "A document widget for uploading files",
    category: "Document",
    icon: "file",
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Current document data as base64",
        hidden: true,
        value: "", // Default empty string
      },
      {
        name: "mimeType",
        type: "string",
        description: "Document MIME type",
        hidden: true,
        value: "application/pdf",
      },
    ],
    outputs: [
      {
        name: "document",
        type: "document",
        description: "The uploaded document as binary data",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      let inputs;
      try {
        if (typeof context.inputs.value !== "string") {
          return this.createErrorResult(
            `Invalid input type: expected string, got ${typeof context.inputs.value}`
          );
        }
        inputs = JSON.parse(context.inputs.value);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown parsing error";
        return this.createErrorResult(
          `Invalid input format: expected JSON string. Error: ${errorMessage}`
        );
      }

      const { value, mimeType } = inputs;

      // Validate inputs
      if (typeof value !== "string") {
        return this.createErrorResult("Value must be a string");
      }

      if (typeof mimeType !== "string") {
        return this.createErrorResult("MIME type must be a string");
      }

      // Convert base64 directly to binary (value is already pure base64)
      const binaryString = atob(value);

      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create properly structured document output
      const documentOutput = {
        data: bytes,
        mimeType,
      };

      // Validate the output structure
      if (!documentOutput.data || !documentOutput.mimeType) {
        throw new Error("Invalid document output structure");
      }

      return this.createSuccessResult({
        document: documentOutput,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
