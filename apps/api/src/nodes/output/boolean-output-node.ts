import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

/**
 * BooleanOutput node implementation
 * This node displays boolean data and persists the value for read-only execution views
 */
export class BooleanOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-boolean",
    name: "Boolean Output",
    type: "output-boolean",
    description: "Display and preview boolean data",
    tags: ["Widget", "Output", "Boolean"],
    icon: "toggle-right",
    documentation:
      "This node displays boolean data in the workflow. The value is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "boolean",
        description: "Boolean value to display",
        required: true,
      },
    ],
    outputs: [
      {
        name: "displayValue",
        type: "boolean",
        description: "Persisted value for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as boolean | undefined;

      // Validate if provided
      if (value !== undefined && typeof value !== "boolean") {
        return this.createErrorResult("Value must be a boolean");
      }

      // Store value in output for persistence across executions
      return this.createSuccessResult({
        displayValue: value ?? false,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
