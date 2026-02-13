import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Sum node implementation that accepts multiple numbers and sums them
 */
export class SumNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "sum",
    name: "Sum",
    type: "sum",
    description: "Sums multiple numbers together",
    tags: ["Math", "Sum"],
    icon: "plus",
    documentation:
      "This node sums multiple numbers together, supporting both single values and arrays of numbers.",
    specification: "result = Σ(numbers)",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "numbers",
        type: "number",
        description: "Numbers to sum (supports multiple connections)",
        required: true,
        repeated: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The sum of all input numbers",
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
        // Validate all inputs are numbers
        for (let i = 0; i < numbers.length; i++) {
          const num = Number(numbers[i]);
          if (isNaN(num)) {
            return this.createErrorResult(
              `Invalid input at position ${i}: expected number, got ${typeof numbers[i]}`
            );
          }
        }

        // Sum all numbers
        const result = numbers.reduce((sum, num) => sum + Number(num), 0);

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
