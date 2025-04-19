import { ExecutableNode, DocumentValue } from "../types";
import { NodeContext, ExecutionResult } from "../types";
import { NodeType } from "../../api/types";

/**
 * Document node implementation
 * This node provides a document widget that allows users to upload documents and outputs them as binary data.
 */
export class DocumentNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "document",
    name: "Document",
    description: "A document widget for uploading files",
    category: "Document",
    icon: "file",
    inputs: [
      {
        name: "value",
        type: DocumentValue,
        description: "Current document as a document reference",
        hidden: true,
        value: new DocumentValue(null),
      },
    ],
    outputs: [
      {
        name: "document",
        type: DocumentValue,
        description: "The uploaded document as a document reference",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { value } = context.inputs;

      // If no value is provided, fail
      if (!value) {
        return this.createErrorResult("No document data provided");
      }

      // If value is already a DocumentValue, check if it contains data
      if (value instanceof DocumentValue) {
        if (!value.getValue()) {
          return this.createErrorResult("Document value is empty");
        }
        return this.createSuccessResult({
          document: value,
        });
      }

      // Handle raw input values
      if (typeof value === "object") {
        // Convert raw object to DocumentValue
        return this.createSuccessResult({
          document: new DocumentValue(value),
        });
      }

      // If we get here, the input is invalid
      return this.createErrorResult(
        "Invalid input: expected a document value object"
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
