import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Avg node implementation that accepts multiple numbers and returns the average
 */
export class AvgNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "avg",
    name: "Average",
    type: "avg",
    description: "Returns the average (mean) value from multiple numbers",
    tags: ["Math"],
    icon: "bar-chart",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "numbers",
        type: "number",
        description:
          "Numbers to calculate average from (supports multiple connections)",
        required: true,
        repeated: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The average (mean) value of the input numbers",
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
          return this.createErrorResult(
            "Cannot calculate average of empty array"
          );
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

        // Calculate average (sum divided by count)
        const sum = numbers.reduce((acc, num) => acc + Number(num), 0);
        const result = sum / numbers.length;

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
