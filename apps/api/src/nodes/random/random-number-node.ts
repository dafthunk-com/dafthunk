import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * RandomNumber node implementation
 * Generates a random number within a specified range
 */
export class RandomNumberNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "random-number",
    name: "Random Number",
    type: "random-number",
    description: "Generate a random number within a specified range",
    tags: ["Random", "Math", "Number"],
    icon: "hash",
    documentation:
      "Generates a random number between min (inclusive) and max (exclusive for integers, inclusive for floats). Set integer to true for whole numbers.",
    inlinable: false,
    asTool: false,
    inputs: [
      {
        name: "min",
        type: "number",
        description: "Minimum value (inclusive)",
        required: false,
        repeated: false,
        value: 0,
      },
      {
        name: "max",
        type: "number",
        description:
          "Maximum value (exclusive for integers, inclusive for floats)",
        required: false,
        repeated: false,
        value: 1,
      },
      {
        name: "integer",
        type: "boolean",
        description: "Generate integer instead of float",
        required: false,
        repeated: false,
        value: false,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "number",
        description: "Generated random number",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { min = 0, max = 1, integer = false } = context.inputs;

      // Validate inputs
      const minNum = Number(min);
      const maxNum = Number(max);

      if (isNaN(minNum)) {
        return this.createErrorResult(
          `Invalid min value: expected number, got ${typeof min}`
        );
      }

      if (isNaN(maxNum)) {
        return this.createErrorResult(
          `Invalid max value: expected number, got ${typeof max}`
        );
      }

      if (minNum >= maxNum) {
        return this.createErrorResult(
          `min (${minNum}) must be less than max (${maxNum})`
        );
      }

      // Generate random number
      let value: number;
      if (integer) {
        // For integers: min (inclusive) to max (exclusive)
        value = Math.floor(Math.random() * (maxNum - minNum)) + minNum;
      } else {
        // For floats: min (inclusive) to max (inclusive)
        value = Math.random() * (maxNum - minNum) + minNum;
      }

      return this.createSuccessResult({ value });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error generating random number: ${error.message}`
      );
    }
  }
}
