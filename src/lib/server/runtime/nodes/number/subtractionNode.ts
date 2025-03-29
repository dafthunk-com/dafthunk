import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../types";
import { NumberNodeParameter } from "../types";

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
      { name: "a", type: NumberNodeParameter, required: true },
      { name: "b", type: NumberNodeParameter, required: true },
    ],
    outputs: [{ name: "result", type: NumberNodeParameter }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      return this.createSuccessResult({
        result: new NumberNodeParameter(a - b),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
