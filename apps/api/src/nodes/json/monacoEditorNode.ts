import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
import { NodeType, NodeExecution } from "../../types";

/**
 * Monaco Editor node implementation
 * This node provides a Monaco Editor widget specifically for JSON editing.
 *
 * The editor's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class MonacoEditorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "monaco-editor",
    name: "JSON Editor",
    type: "monacoEditor",
    description: "A Monaco Editor widget for editing and validating JSON",
    category: "JSON",
    icon: "code",
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Current JSON value in the editor",
        hidden: true,
        value: "{}",
      },
    ],
    outputs: [
      {
        name: "value",
        type: "json",
        description: "The current JSON value from the editor",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { value } = context.inputs;

      // Parse JSON
      try {
        const parsedValue = JSON.parse(value);
        return this.createSuccessResult({
          value: parsedValue,
        });
      } catch (error) {
        return this.createErrorResult(
          error instanceof Error ? error.message : "Invalid JSON"
        );
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
