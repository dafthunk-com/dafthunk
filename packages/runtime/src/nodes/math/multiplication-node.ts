import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Multiplication node implementation
 */
export class MultiplicationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "multiplication",
    name: "Multiplication",
    type: "multiplication",
    description: "Multiplies two numbers",
    tags: ["Math", "Multiplication"],
    icon: "x",
    documentation:
      "This node multiplies two numbers together to produce their product.",
    specification: "result = a * b",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "a",
        type: "number",
        description: "The first number to multiply",
        required: true,
      },
      {
        name: "b",
        type: "number",
        description: "The second number to multiply",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The product of the two input numbers",
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

      return this.createSuccessResult({
        result: a * b,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
