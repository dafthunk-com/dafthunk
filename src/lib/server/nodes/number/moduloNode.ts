import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { NumberValue } from "../types";

/**
 * Modulo node implementation - calculates remainder after division
 */
export class ModuloNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "modulo",
    name: "Modulo",
    type: "modulo",
    description: "Calculates the remainder after division",
    category: "Number",
    icon: "percent",
    inputs: [
      { name: "a", type: NumberValue, required: true },
      { name: "b", type: NumberValue, required: true },
    ],
    outputs: [{ name: "result", type: NumberValue }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      if (b === 0) {
        return this.createErrorResult("Modulo by zero is not allowed");
      }

      return this.createSuccessResult({
        result: new NumberValue(a % b),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
