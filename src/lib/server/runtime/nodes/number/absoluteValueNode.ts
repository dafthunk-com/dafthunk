import { ExecutableNode } from "../executableNode";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../nodeTypes";
import { NumberNodeParameter } from "../nodeParameterTypes";

/**
 * Absolute Value node implementation
 */
export class AbsoluteValueNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "absolute-value",
    name: "Absolute Value",
    type: "absolute-value",
    description: "Calculates the absolute value of a number",
    category: "Number",
    icon: "absolute",
    inputs: [{ name: "value", type: NumberNodeParameter, required: true }],
    outputs: [{ name: "result", type: NumberNodeParameter }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const value = Number(context.inputs.value);

      if (isNaN(value)) {
        return this.createErrorResult("Input must be a number");
      }

      return this.createSuccessResult({
        result: new NumberNodeParameter(Math.abs(value)),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
