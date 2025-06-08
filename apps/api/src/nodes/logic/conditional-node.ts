import { Node } from "@dafthunk/types";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext, ParameterValue } from "../types";

export class ConditionalNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "conditional",
    name: "Conditional",
    type: "conditional",
    description:
      "Outputs a value to one of two branches based on a boolean condition.",
    category: "Logic",
    icon: "git-branch",
    inputs: [
      {
        name: "condition",
        type: "boolean",
        description: "The boolean condition to evaluate.",
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
        name: "true_case",
        type: "any",
        description: "Output if the condition is true.",
      },
      {
        name: "false_case",
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
      outputs.true_case = value;
    } else {
      outputs.false_case = value;
    }

    return this.createSuccessResult(outputs);
  }
} 