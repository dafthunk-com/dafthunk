import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Max node implementation that accepts multiple numbers and returns the maximum
 */
export class MaxNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "max",
    name: "Max",
    type: "max",
    description: "Returns the maximum value from multiple numbers",
    tags: ["Math", "Maximum"],
    icon: "arrow-up",
    documentation: "This node returns the maximum value from multiple numbers.",
    specification: "result = max(numbers), where |numbers| > 0",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "numbers",
        type: "number",
        description:
          "Numbers to find maximum from (supports multiple connections)",
        required: true,
        repeated: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The maximum value from the input numbers",
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
          return this.createErrorResult("Cannot find maximum of empty array");
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

        // Find maximum value
        const result = Math.max(...numbers.map((num) => Number(num)));

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
