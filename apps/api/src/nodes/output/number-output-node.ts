import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * NumberOutput node implementation
 * This node displays numeric data and persists the value for read-only execution views
 */
export class NumberOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-number",
    name: "Number Output",
    type: "output-number",
    description: "Display and preview numeric data",
    tags: ["Widget", "Output", "Number"],
    icon: "hash",
    documentation:
      "This node displays numeric data in the workflow. The value is persisted for viewing in read-only execution and deployed workflow views.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "number",
        description: "Numeric value to display",
        required: true,
      },
    ],
    outputs: [
      {
        name: "displayValue",
        type: "number",
        description: "Persisted value for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as number | undefined;

      // Validate if provided
      if (value !== undefined && typeof value !== "number") {
        return this.createErrorResult("Value must be a number");
      }

      // Store value in output for persistence across executions
      return this.createSuccessResult({
        displayValue: value ?? 0,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
