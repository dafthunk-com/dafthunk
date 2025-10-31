import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * JSON Editor node implementation
 * This node provides a JSON Editor widget specifically for JSON editing.
 *
 * The editor's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class JsonEditorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-editor",
    name: "JSON Editor",
    type: "json-editor",
    description: "A JSON Editor widget for editing and validating JSON",
    tags: ["Widget", "Data", "JSON", "Edit"],
    icon: "code",
    documentation:
      "This node provides a JSON editor widget for editing and validating JSON data with syntax highlighting and error checking.",
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

      // Handle null, undefined, or empty string
      if (value === null || value === undefined || value === "") {
        return this.createErrorResult("Invalid JSON");
      }

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
