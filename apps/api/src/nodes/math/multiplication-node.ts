import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Multiplication node implementation
 */
export class MultiplicationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "multiplication",
    name: "Multiplication",
    type: "multiplication",
    description: "Multiplies two numbers",
    tags: ["Math"],
    icon: "x",
    inputs: [
      { name: "a", type: "number", required: true },
      { name: "b", type: "number", required: true },
    ],
    outputs: [{ name: "result", type: "number" }],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
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
