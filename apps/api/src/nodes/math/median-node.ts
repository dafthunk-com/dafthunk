import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Median node implementation that accepts multiple numbers and returns the median
 */
export class MedianNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "median",
    name: "Median",
    type: "median",
    description:
      "Returns the median value from multiple numbers (middle value when sorted)",
    tags: ["Math", "Median"],
    icon: "chart-bar-stacked",
    documentation:
      "This node returns the median value from multiple numbers (middle value when sorted).",
    specification:
      "result = median(sort(numbers)), where |numbers| > 0; if n is even: (numbers[n/2-1] + numbers[n/2]) / 2, else: numbers[⌊n/2⌋]",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "numbers",
        type: "number",
        description:
          "Numbers to calculate median from (supports multiple connections)",
        required: true,
        repeated: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description:
          "The median value of the input numbers (middle value when sorted)",
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
            "Cannot calculate median of empty array"
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

        // Convert all inputs to numbers and sort them
        const sortedNumbers = numbers
          .map((num) => Number(num))
          .sort((a, b) => a - b);

        // Calculate median
        let result: number;
        const length = sortedNumbers.length;

        if (length % 2 === 0) {
          // Even number of elements: median is average of two middle values
          const mid1 = sortedNumbers[length / 2 - 1];
          const mid2 = sortedNumbers[length / 2];
          result = (mid1 + mid2) / 2;
        } else {
          // Odd number of elements: median is the middle value
          result = sortedNumbers[Math.floor(length / 2)];
        }

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
