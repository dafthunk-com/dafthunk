import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Exponentiation node implementation
 */
export class ExponentiationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "exponentiation",
    name: "Exponentiation",
    type: "exponentiation",
    description: "Raises a base number to the power of an exponent",
    tags: ["Math"],
    icon: "superscript",
    documentation:
      "This node raises a base number to the power of an exponent.",
    specification: "result = base ^ exponent",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "base",
        type: "number",
        description: "The base number to be raised to a power",
        required: true,
      },
      {
        name: "exponent",
        type: "number",
        description: "The power to raise the base to",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The result of base raised to the power of exponent",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const base = Number(context.inputs.base);
      const exponent = Number(context.inputs.exponent);

      if (isNaN(base) || isNaN(exponent)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      return this.createSuccessResult({
        result: Math.pow(base, exponent),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
