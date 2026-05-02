import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Conditional Join Node
 *
 * Joins two mutually exclusive branches ('true' and 'false') into a single flow.
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
      "Joins two mutually exclusive branches ('true' and 'false') into a single flow. Emits the value from the active branch. Errors if both or neither are provided.",
    tags: ["Logic", "Branch", "Join"],
    icon: "git-merge",
    documentation:
      "This node joins two mutually exclusive workflow branches into a single flow, emitting the value from whichever branch was active.",
    inlinable: true,
    inputs: [
      {
        name: "true",
        type: "any",
        description: "Value from the 'true' branch of a Conditional Fork.",
        required: false, // Non-required so node can execute with only one input
      },
      {
        name: "false",
        type: "any",
        description: "Value from the 'false' branch of a Conditional Fork.",
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

  async execute(context: NodeContext): Promise<NodeExecution> {
    const trueValue = context.inputs.true;
    const falseValue = context.inputs.false;

    const hasTrue = trueValue !== undefined;
    const hasFalse = falseValue !== undefined;

    if (!hasTrue && !hasFalse) {
      return this.createErrorResult(
        "ConditionalJoin node requires exactly one input, but neither 'true' nor 'false' was provided. This suggests an error in the workflow design."
      );
    }

    if (hasTrue && hasFalse) {
      return this.createErrorResult(
        "ConditionalJoin node requires exactly one input, but both 'true' and 'false' were provided. This violates the exclusive join condition."
      );
    }

    const result = hasTrue ? trueValue : falseValue;

    return this.createSuccessResult({
      result,
    });
  }
}
