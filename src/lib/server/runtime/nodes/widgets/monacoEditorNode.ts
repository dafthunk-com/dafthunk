import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * Monaco Editor node implementation
 * This node provides a Monaco Editor widget specifically for JSON editing.
 *
 * The editor's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class MonacoEditorNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "monaco-editor",
    name: "JSON Editor",
    type: "monaco-editor",
    description: "A Monaco Editor widget for editing and validating JSON",
    category: "Widgets",
    icon: "code",
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Current JSON value in the editor",
        hidden: true,
        value: "{}"
      }
    ],
    outputs: [
      {
        name: "value",
        type: "json",
        description: "The current JSON value from the editor",
      }
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const value = context.inputs.value as string;

      console.log(value)

      // Validate inputs
      if (typeof value !== "string") {
        return this.createErrorResult("Value must be a string");
      }
      
      // Validate JSON
      try {
        const parsedValue = JSON.parse(value);
        return this.createSuccessResult({
          value: parsedValue
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