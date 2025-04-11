import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { NumberValue } from "../types";

/**
 * Absolute Value node implementation
 */
export class AbsoluteValueNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "absolute-value",
    name: "Absolute Value",
    description: "Calculates the absolute value of a number",
    category: "Number",
    icon: "absolute",
    inputs: [{ name: "value", type: NumberValue, required: true }],
    outputs: [{ name: "result", type: NumberValue }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const value = Number(context.inputs.value);

      if (isNaN(value)) {
        return this.createErrorResult("Input must be a number");
      }

      return this.createSuccessResult({
        result: new NumberValue(Math.abs(value)),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
