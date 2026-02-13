import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * BooleanInput node implementation
 * This node provides a boolean input widget that outputs the entered boolean value.
 *
 * The boolean input's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class BooleanInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "boolean-input",
    name: "Boolean Input",
    type: "boolean-input",
    description: "A boolean input widget for entering true/false values",
    tags: ["Widget", "Logic", "Boolean", "Input"],
    icon: "toggle-left",
    documentation:
      "This node provides a boolean input widget for entering true/false values.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "boolean",
        description: "Current boolean value",
        hidden: true,
        value: false, // Default to false
      },
    ],
    outputs: [
      {
        name: "value",
        type: "boolean",
        description: "The current boolean value from the input",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value;

      // Convert string "true"/"false" to boolean if needed
      const boolValue =
        typeof value === "string" ? value === "true" : Boolean(value);

      return this.createSuccessResult({
        value: boolValue,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
