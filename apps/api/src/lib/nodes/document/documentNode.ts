import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
import { NodeType, NodeExecution } from "../../api/types";

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
        type: "document",
        description: "Current document as a document reference",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "document",
        type: "document",
        description: "The uploaded document as a document reference",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value } = context.inputs;

      // If no value is provided, fail
      if (!value) {
        return this.createErrorResult("No document data provided");
      }

      // Convert raw object to DocumentValue
      return this.createSuccessResult({
        document: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
