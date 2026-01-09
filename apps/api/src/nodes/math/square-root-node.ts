import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

/**
 * Square Root node implementation
 */
export class SquareRootNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "square-root",
    name: "Square Root",
    type: "square-root",
    description: "Calculates the square root of a number",
    tags: ["Math", "SquareRoot"],
    icon: "radical",
    documentation: "This node calculates the square root of a number.",
    specification: "result = √value, where value ≥ 0",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "value",
        type: "number",
        description: "The number to calculate the square root of",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The square root of the input number",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (context.inputs.value === undefined || context.inputs.value === null) {
        return this.createErrorResult("Input 'value' is required");
      }

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
