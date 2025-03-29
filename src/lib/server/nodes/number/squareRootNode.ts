import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { NumberParameter } from "../types";

/**
 * Square Root node implementation
 */
export class SquareRootNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "square-root",
    name: "Square Root",
    type: "square-root",
    description: "Calculates the square root of a number",
    category: "Number",
    icon: "square-root",
    inputs: [{ name: "value", type: NumberParameter, required: true }],
    outputs: [{ name: "result", type: NumberParameter }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const value = Number(context.inputs.value);

      if (isNaN(value)) {
        return this.createErrorResult("Input must be a number");
      }

      if (value < 0) {
        return this.createErrorResult(
          "Cannot calculate square root of a negative number"
        );
      }

      return this.createSuccessResult({
        result: new NumberParameter(Math.sqrt(value)),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
