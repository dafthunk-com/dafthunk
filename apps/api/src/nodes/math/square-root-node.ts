import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Square Root node implementation
 */
export class SquareRootNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "square-root",
    name: "Square Root",
    type: "square-root",
    description: "Calculates the square root of a number",
    tags: ["Math"],
    icon: "square-root",
    inlinable: true,
    inputs: [{ name: "value", type: "number", required: true }],
    outputs: [{ name: "result", type: "number" }],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const value = Number(context.inputs.value);

      if (isNaN(value)) {
        return this.createErrorResult("Input must be a number");
      }

      if (value < 0) {
        return this.createErrorResult(
          "Square root of negative numbers is not supported"
        );
      }

      return this.createSuccessResult({
        result: Math.sqrt(value),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
