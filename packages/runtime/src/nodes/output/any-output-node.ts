import {
  ExecutableNode,
  type NodeContext,
  type ParameterValue,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

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
      "This node displays any data type in the workflow. It accepts any parameter type and persists the value for viewing in read-only execution views. Useful for generic data inspection.",
    inlinable: true,
    asTool: false,
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

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      // The "any" port accepts every parameter type, so there is nothing to
      // validate: the value is forwarded untouched.
      const value: ParameterValue = context.inputs.value;

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
