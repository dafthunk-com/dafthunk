import {
  ExecutableNode,
  type NodeContext,
  type ParameterValue,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Switch Fork Node
 *
 * Routes a value to one of several outputs based on a string selector.
 * Compares selector === case_i in numeric order; first match wins.
 * If no case matches, the value is emitted on the 'default' output.
 */
export class SwitchForkNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "switch-fork",
    name: "Switch Fork",
    type: "switch-fork",
    description:
      "Routes a value to a matching 'case_n' output based on a string selector, or 'default' when no case matches.",
    tags: ["Logic", "Branch", "Switch"],
    icon: "git-branch",
    documentation:
      "This node compares 'selector' against each 'case_n' key by strict equality and routes the 'value' to the matching 'case_n' output. If no case matches, the value flows to 'default'.",
    inlinable: true,
    dynamicInputs: {
      prefix: "case",
      type: "string",
      defaultCount: 2,
      minCount: 1,
    },
    inputs: [
      {
        name: "value",
        type: "any",
        description: "The value to forward to the selected case output.",
        required: true,
      },
      {
        name: "selector",
        type: "string",
        description: "The string used to select which case output is taken.",
        required: true,
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
        type: "string",
        description: "Case key compared against the selector.",
      },
      {
        name: "case_2",
        type: "string",
        description: "Case key compared against the selector.",
      },
    ],
    outputs: [
      {
        name: "default",
        type: "any",
        description: "Output when no case matches.",
      },
      {
        name: "case_1",
        type: "any",
        description: "Output when selector equals case_1.",
      },
      {
        name: "case_2",
        type: "any",
        description: "Output when selector equals case_2.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { selector, value, ...rest } = context.inputs;

    if (typeof selector !== "string") {
      return this.createErrorResult("Selector must be a string.");
    }

    if (value === undefined) {
      return this.createErrorResult("Value input is required.");
    }

    const cases = Object.entries(rest)
      .filter(([key]) => /^case_\d+$/.test(key))
      .sort(([a], [b]) => {
        const numA = Number.parseInt(a.slice("case_".length), 10);
        const numB = Number.parseInt(b.slice("case_".length), 10);
        return numA - numB;
      });

    const outputs: Record<string, ParameterValue> = {};
    for (const [name, caseKey] of cases) {
      if (caseKey === selector) {
        outputs[name] = value as ParameterValue;
        return this.createSuccessResult(outputs);
      }
    }

    outputs.default = value as ParameterValue;
    return this.createSuccessResult(outputs);
  }
}
