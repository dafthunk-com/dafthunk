import { ExecutableNode, DocumentValue, StringValue } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";

/**
 * Document node implementation
 * This node provides a document widget that allows users to upload documents and outputs them as binary data.
 */
export class DocumentNode extends ExecutableNode {
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
        type: StringValue,
        description: "Current document data as base64",
        hidden: true,
        value: new StringValue(""), // Default empty string
      },
      {
        name: "mimeType",
        type: StringValue,
        description: "Document MIME type",
        hidden: true,
        value: new StringValue("application/pdf"), // Default PDF
      },
    ],
    outputs: [
      {
        name: "document",
        type: DocumentValue,
        description: "The uploaded document as binary data",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const value = context.inputs.value;

      // Validate input
      if (typeof value !== "string") {
        return this.createErrorResult("Value must be a string");
      }

      // Parse the JSON string from the widget
      let documentData: { value: string; mimeType: string };
      try {
        documentData = JSON.parse(value);
      } catch (error) {
        return this.createErrorResult("Invalid document data format");
      }

      // Validate parsed data
      if (!documentData.value || typeof documentData.value !== "string") {
        return this.createErrorResult("Document value must be a string");
      }

      if (!documentData.mimeType || typeof documentData.mimeType !== "string") {
        return this.createErrorResult("MIME type must be a string");
      }

      // Convert base64 to binary
      const binaryString = atob(documentData.value);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create document output
      const documentOutput = {
        data: bytes,
        mimeType: documentData.mimeType,
      };

      // Validate using DocumentValue
      const documentValue = new DocumentValue(documentOutput);
      const validation = documentValue.validate();
      if (!validation.isValid) {
        return this.createErrorResult(
          validation.error || "Invalid document data"
        );
      }

      return this.createSuccessResult({
        document: documentValue,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
