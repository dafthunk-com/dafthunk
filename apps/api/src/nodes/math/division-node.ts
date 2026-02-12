import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

/**
 * Division node implementation
 */
export class DivisionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "division",
    name: "Division",
    type: "division",
    description: "Divides one number by another",
    tags: ["Math", "Division"],
    icon: "divide",
    documentation:
      "This node divides one number by another to produce their quotient.",
    specification: "result = a / b, where b ≠ 0",
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
        description: "The quotient of a divided by b",
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
        result: a / b,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
