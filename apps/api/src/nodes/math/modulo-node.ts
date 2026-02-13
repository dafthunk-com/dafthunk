import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Modulo node implementation
 */
export class ModuloNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "modulo",
    name: "Modulo",
    type: "modulo",
    description:
      "Calculates the remainder when one number is divided by another",
    tags: ["Math", "Modulo"],
    icon: "percent",
    documentation:
      "This node calculates the remainder when one number is divided by another.",
    specification: "result = a % b, where b ≠ 0",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "a",
        type: "number",
        description: "The dividend (number to be divided)",
        required: true,
      },
      {
        name: "b",
        type: "number",
        description: "The divisor (number to divide by)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The remainder after dividing a by b",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (context.inputs.a === undefined || context.inputs.a === null) {
        return this.createErrorResult("Input 'a' is required");
      }
      if (context.inputs.b === undefined || context.inputs.b === null) {
        return this.createErrorResult("Input 'b' is required");
      }

      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      if (b === 0) {
        return this.createErrorResult("Division by zero is not allowed");
      }

      return this.createSuccessResult({
        result: a % b,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
