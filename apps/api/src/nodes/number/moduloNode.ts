import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

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
    category: "Number",
    icon: "percent",
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
