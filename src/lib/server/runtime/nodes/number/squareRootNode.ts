import { ExecutableNode } from "../nodeTypes";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../nodeTypes";
import { NumberNodeParameter } from "../nodeParameterTypes";

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
    inputs: [{ name: "value", type: NumberNodeParameter, required: true }],
    outputs: [{ name: "result", type: NumberNodeParameter }],
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
        result: new NumberNodeParameter(Math.sqrt(value)),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
