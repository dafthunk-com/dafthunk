import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Subtraction node implementation
 */
export class SubtractionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "subtraction",
    name: "Subtraction",
    type: "subtraction",
    description: "Subtracts one number from another",
    tags: ["Math"],
    icon: "minus",
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
        result: a - b,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
