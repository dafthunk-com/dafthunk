import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * Absolute Value node implementation
 */
export class AbsoluteValueNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "absolute-value",
    name: "Absolute Value",
    type: "absolute-value",
    description: "Calculates the absolute value of a number",
    category: "Number",
    icon: "absolute",
    inputs: [{ name: "value", type: "number", required: true }],
    outputs: [{ name: "result", type: "number" }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const value = Number(context.inputs.value);

      if (isNaN(value)) {
        return this.createErrorResult("Input must be a number");
      }

      return this.createSuccessResult({
        result: Math.abs(value),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
