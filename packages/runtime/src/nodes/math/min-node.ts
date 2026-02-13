import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Min node implementation that accepts multiple numbers and returns the minimum
 */
export class MinNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "min",
    name: "Min",
    type: "min",
    description: "Returns the minimum value from multiple numbers",
    tags: ["Math", "Minimum"],
    icon: "arrow-down",
    documentation: "This node returns the minimum value from multiple numbers.",
    specification: "result = min(numbers), where |numbers| > 0",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "numbers",
        type: "number",
        description:
          "Numbers to find minimum from (supports multiple connections)",
        required: true,
        repeated: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The minimum value from the input numbers",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { numbers } = context.inputs;

      // Handle missing input
      if (numbers === null || numbers === undefined) {
        return this.createErrorResult("No number inputs provided");
      }

      // Handle single number input
      if (typeof numbers === "number") {
        return this.createSuccessResult({
          result: numbers,
        });
      }

      // Handle array of numbers (multiple connections)
      if (Array.isArray(numbers)) {
        // Handle empty array
        if (numbers.length === 0) {
          return this.createErrorResult("Cannot find minimum of empty array");
        }

        // Validate all inputs are numbers
        for (let i = 0; i < numbers.length; i++) {
          const num = Number(numbers[i]);
          if (isNaN(num)) {
            return this.createErrorResult(
              `Invalid input at position ${i}: expected number, got ${typeof numbers[i]}`
            );
          }
        }

        // Find minimum value
        const result = Math.min(...numbers.map((num) => Number(num)));

        return this.createSuccessResult({
          result,
        });
      }

      return this.createErrorResult(
        "Invalid input type: expected number or array of numbers"
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
