import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * AnyOutput node implementation
 * This node displays any data type and persists the value for read-only execution views
 * Can accept any parameter type (mixed types)
 */
export class AnyOutputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "output-any",
    name: "Any Output",
    type: "output-any",
    description: "Display and preview any data type",
    tags: ["Widget", "Output", "Any"],
    icon: "eye",
    documentation:
      "This node displays any data type in the workflow. It accepts any parameter type and persists the value for viewing in read-only execution and deployed workflow views. Useful for generic data inspection.",
    inlinable: true,
    inputs: [
      {
        name: "value",
        type: "any",
        description: "Any value to display",
        required: true,
      },
    ],
    outputs: [
      {
        name: "displayValue",
        type: "any",
        description: "Persisted value for preview display",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = context.inputs.value as any;

      // The "any" type accepts anything - no validation needed
      // Just pass through the value as-is

      // Store value in output for persistence across executions
      return this.createSuccessResult({
        displayValue: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
