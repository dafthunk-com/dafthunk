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
      // Get the raw value from the RuntimeParameterValue
      const value = context.inputs.value?.getValue?.() ?? context.inputs.value;
      
      // If no value is provided, return null
      if (!value) {
        return this.createSuccessResult({
          document: new DocumentValue(null),
        });
      }

      // Handle string input (for backward compatibility)
      if (typeof value === 'string') {
        try {
          // Try to parse the string as JSON
          const parsedValue = JSON.parse(value);
          if (parsedValue && typeof parsedValue === 'object') {
            return this.createSuccessResult({
              document: new DocumentValue(parsedValue),
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Check if the value is an object
      if (typeof value !== 'object') {
        return this.createErrorResult(
          `Invalid input type: expected object, got ${typeof value}`
        );
      }

      // Pass the value directly to the DocumentValue constructor
      // The DocumentValue class will validate the value format
      return this.createSuccessResult({
        document: new DocumentValue(value),
      });
    } catch (error) {
      // Return a clean error message without logging
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error in DocumentNode"
      );
    }
  }
}
