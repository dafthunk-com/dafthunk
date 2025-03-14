import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * Square Root node implementation
 */
export class SquareRootNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "square-root",
    name: "Square Root",
    type: "square-root",
    description: "Calculates the square root of a number",
    category: "Math",
    icon: "square-root",
    inputs: [{ name: "value", type: "number" }],
    outputs: [{ name: "result", type: "number" }],
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
        result: Math.sqrt(value),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
