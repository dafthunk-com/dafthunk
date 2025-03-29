import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { NumberParameter } from "../types";

/**
 * Subtraction node implementation
 */
export class SubtractionNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "subtraction",
    name: "Subtraction",
    type: "subtraction",
    description: "Subtracts one number from another",
    category: "Number",
    icon: "minus",
    inputs: [
      { name: "a", type: NumberParameter, required: true },
      { name: "b", type: NumberParameter, required: true },
    ],
    outputs: [{ name: "result", type: NumberParameter }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      return this.createSuccessResult({
        result: new NumberParameter(a - b),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
