import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { NumberValue } from "../types";

/**
 * Multiplication node implementation
 */
export class MultiplicationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "multiplication",
    name: "Multiplication",
    description: "Multiplies two numbers",
    category: "Number",
    icon: "x",
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

      return this.createSuccessResult({
        result: new NumberValue(a * b),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
