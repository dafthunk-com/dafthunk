import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Subtraction node implementation
 */
export class SubtractionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "subtraction",
    name: "Subtraction",
    type: "subtraction",
    description: "Subtracts one number from another",
    tags: ["Math", "Subtraction"],
    icon: "minus",
    documentation:
      "This node subtracts one number from another to produce their difference.",
    specification: "result = a - b",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "a",
        type: "number",
        description: "The number to subtract from (minuend)",
        required: true,
      },
      {
        name: "b",
        type: "number",
        description: "The number to subtract (subtrahend)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "number",
        description: "The difference between a and b (a - b)",
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
        result: a - b,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
