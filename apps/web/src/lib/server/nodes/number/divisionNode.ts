import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { NumberValue } from "../types";

/**
 * Division node implementation
 */
export class DivisionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "division",
    name: "Division",
    description: "Divides one number by another",
    category: "Number",
    icon: "divide",
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
        return this.createErrorResult("Division by zero is not allowed");
      }

      return this.createSuccessResult({
        result: new NumberValue(a / b),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
