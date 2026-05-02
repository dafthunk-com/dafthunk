import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Switch Join Node
 *
 * Joins N mutually exclusive branches into a single flow.
 * Emits the value from whichever 'case_n' or 'default' branch was active.
 * Errors if more than one or none are provided. Mirrors Switch Fork.
 */
export class SwitchJoinNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "switch-join",
    name: "Switch Join",
    type: "switch-join",
    description:
      "Joins N mutually exclusive branches into a single flow. Emits the value from the active branch. Errors if more than one or none are provided.",
    tags: ["Logic", "Branch", "Switch"],
    icon: "git-merge",
    documentation:
      "This node joins the outputs of a Switch Fork (or any equivalent N-way split) into a single value. Exactly one of 'case_n' or 'default' must be present.",
    inlinable: true,
    dynamicInputs: {
      prefix: "case",
      type: "any",
      defaultCount: 2,
      minCount: 1,
    },
    inputs: [
      {
        name: "default",
        type: "any",
        description: "Value from the unmatched ('default') branch.",
        required: false,
      },
      {
        name: "cases",
        type: "any",
        description:
          "Number of case branches (managed by the inspector widget).",
        hidden: true,
      },
      {
        name: "case_1",
        type: "any",
        description: "Value from branch 'case_1'.",
        required: false,
      },
      {
        name: "case_2",
        type: "any",
        description: "Value from branch 'case_2'.",
        required: false,
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
    const present = Object.entries(context.inputs).filter(([key, value]) => {
      if (value === undefined) return false;
      return key === "default" || /^case_\d+$/.test(key);
    });

    if (present.length === 0) {
      return this.createErrorResult(
        "SwitchJoin node requires exactly one input, but none was provided. This suggests an error in the workflow design."
      );
    }

    if (present.length > 1) {
      const names = present.map(([key]) => key).join(", ");
      return this.createErrorResult(
        `SwitchJoin node requires exactly one input, but multiple were provided (${names}). This violates the exclusive join condition.`
      );
    }

    const [, result] = present[0];

    return this.createSuccessResult({ result });
  }
}
