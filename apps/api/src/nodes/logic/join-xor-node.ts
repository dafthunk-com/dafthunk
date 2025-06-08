import { Node } from "@dafthunk/types";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext, ParameterValue } from "../types";

export class JoinXorNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "join-xor",
    name: "Join XOR",
    type: "join-xor",
    description:
      "Joins two conditional branches using XOR logic - exactly one input should provide data while the other is skipped.",
    category: "Logic",
    icon: "git-merge",
    inputs: [
      {
        name: "valueA",
        type: "any",
        description: "Value from the first conditional branch.",
        required: false, // Non-required so node can execute with only one input
      },
      {
        name: "valueB",
        type: "any",
        description: "Value from the second conditional branch.",
        required: false, // Non-required so node can execute with only one input
      },
    ],
    outputs: [
      {
        name: "result",
        type: "any",
        description: "The value from whichever branch was active.",
      },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { valueA, valueB } = context.inputs;

    // Check which inputs are present (not undefined)
    const hasValueA = valueA !== undefined;
    const hasValueB = valueB !== undefined;

    // Validate XOR condition: exactly one input should be present
    if (!hasValueA && !hasValueB) {
      return this.createErrorResult(
        "JoinXor node requires exactly one input, but neither valueA nor valueB was provided. This suggests an error in the workflow design."
      );
    }

    if (hasValueA && hasValueB) {
      return this.createErrorResult(
        "JoinXor node requires exactly one input, but both valueA and valueB were provided. This violates the XOR condition - only one branch should be active."
      );
    }

    // Emit the value from whichever branch was active
    const result = hasValueA ? valueA : valueB;

    return this.createSuccessResult({
      result,
    });
  }
} 