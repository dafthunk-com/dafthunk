import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { NumberParameter } from "../types";

/**
 * Exponentiation node implementation - raises base to an exponent
 */
export class ExponentiationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "exponentiation",
    name: "Exponentiation",
    type: "exponentiation",
    description: "Raises a base to an exponent",
    category: "Number",
    icon: "power",
    inputs: [
      { name: "base", type: NumberParameter, required: true },
      { name: "exponent", type: NumberParameter, required: true },
    ],
    outputs: [{ name: "result", type: NumberParameter }],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const base = Number(context.inputs.base);
      const exponent = Number(context.inputs.exponent);

      if (isNaN(base) || isNaN(exponent)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      return this.createSuccessResult({
        result: new NumberParameter(Math.pow(base, exponent)),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
