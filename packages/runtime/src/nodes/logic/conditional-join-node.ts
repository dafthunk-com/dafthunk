import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { Node, NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Conditional Join Node
 *
 * Joins two mutually exclusive branches ('a' and 'b') into a single flow.
 * Emits the value from whichever branch was active. If both or neither are provided, throws an error.
 *
 * Typically used to join the outputs of a Conditional Fork node.
 */
export class ConditionalJoinNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "conditional-join",
    name: "Conditional Join",
    type: "conditional-join",
    description:
      "Joins two mutually exclusive branches ('a' and 'b') into a single flow. Emits the value from the active branch. Errors if both or neither are provided.",
    tags: ["Logic", "Branch", "Join"],
    icon: "git-merge",
    documentation:
      "This node joins two mutually exclusive workflow branches into a single flow, emitting the value from whichever branch was active.",
    inlinable: true,
    inputs: [
      {
        name: "a",
        type: "any",
        description: "Value from branch 'a' (e.g., 'true' output of a fork).",
        required: false, // Non-required so node can execute with only one input
      },
      {
        name: "b",
        type: "any",
        description: "Value from branch 'b' (e.g., 'false' output of a fork).",
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
    const { a, b } = context.inputs;

    // Check which inputs are present (not undefined)
    const hasA = a !== undefined;
    const hasB = b !== undefined;

    // Validate exclusive condition: exactly one input should be present
    if (!hasA && !hasB) {
      return this.createErrorResult(
        "ConditionalJoin node requires exactly one input, but neither 'a' nor 'b' was provided. This suggests an error in the workflow design."
      );
    }

    if (hasA && hasB) {
      return this.createErrorResult(
        "ConditionalJoin node requires exactly one input, but both 'a' and 'b' were provided. This violates the exclusive join condition."
      );
    }

    // Emit the value from whichever branch was active
    const result = hasA ? a : b;

    return this.createSuccessResult({
      result,
    });
  }
}
