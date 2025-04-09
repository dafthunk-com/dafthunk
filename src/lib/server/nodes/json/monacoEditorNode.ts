import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { JsonValue, StringValue } from "../types";

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
    description: "A Monaco Editor widget for editing and validating JSON",
    category: "JSON",
    icon: "code",
    inputs: [
      {
        name: "value",
        type: StringValue,
        description: "Current JSON value in the editor",
        hidden: true,
        value: new StringValue("{}"),
      },
    ],
    outputs: [
      {
        name: "value",
        type: JsonValue,
        description: "The current JSON value from the editor",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { value } = context.inputs;

      // Parse JSON
      try {
        const parsedValue = JSON.parse(value);
        return this.createSuccessResult({
          value: new JsonValue(parsedValue),
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
