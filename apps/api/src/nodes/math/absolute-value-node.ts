import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Absolute Value node implementation
 */
export class AbsoluteValueNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "absolute-value",
    name: "Absolute Value",
    type: "absolute-value",
    description: "Calculates the absolute value of a number",
    tags: ["Math", "Absolute"],
    icon: "square-plus",
    documentation: "This node calculates the absolute value of a number.",
    specification: "result = |value|",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "value",
        type: "number",
        description: "The number to calculate the absolute value of",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The absolute value of the input number",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = Number(context.inputs.value);

      if (isNaN(value)) {
        return this.createErrorResult("Input must be a number");
      }

      return this.createSuccessResult({
        result: Math.abs(value),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
