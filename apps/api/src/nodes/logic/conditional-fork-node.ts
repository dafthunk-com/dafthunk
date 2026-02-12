import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import {
  ExecutableNode,
  NodeContext,
  ParameterValue,
} from "@dafthunk/runtime";

/**
 * Conditional Fork Node
 *
 * Splits the workflow into two branches based on a boolean condition.
 * The 'true' output is taken if the condition is true, 'false' if the condition is false.
 */
export class ConditionalForkNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "conditional-fork",
    name: "Conditional Fork",
    type: "conditional-fork",
    description:
      "Splits the workflow into two branches based on a boolean condition. The 'true' output is taken if the condition is true, 'false' if false.",
    tags: ["Logic", "Branch", "Fork"],
    icon: "git-branch",
    documentation:
      "This node splits workflow execution into two branches based on a boolean condition, routing data to either the 'true' or 'false' output.",
    inlinable: true,
    inputs: [
      {
        name: "condition",
        type: "boolean",
        description:
          "The boolean condition to evaluate (true → 'true', false → 'false').",
        required: true,
      },
      {
        name: "value",
        type: "any",
        description: "The value to pass to the selected branch.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "true",
        type: "any",
        description: "Output if the condition is true.",
      },
      {
        name: "false",
        type: "any",
        description: "Output if the condition is false.",
      },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { condition, value } = context.inputs;

    if (typeof condition !== "boolean") {
      return this.createErrorResult("Condition must be a boolean.");
    }

    if (value === undefined) {
      return this.createErrorResult("Value input is required.");
    }

    const outputs: Record<string, ParameterValue> = {};
    if (condition) {
      outputs.true = value;
    } else {
      outputs.false = value;
    }

    return this.createSuccessResult(outputs);
  }
}
