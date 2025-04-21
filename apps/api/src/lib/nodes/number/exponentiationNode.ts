import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
import { NodeType, NodeExecution } from "../../api/types";

/**
 * Exponentiation node implementation
 */
export class ExponentiationNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "exponentiation",
    name: "Exponentiation",
    type: "exponentiation",
    description: "Raises a base number to the power of an exponent",
    category: "Number",
    icon: "x-to-the-power-of-y",
    inputs: [
      { name: "base", type: "number", required: true },
      { name: "exponent", type: "number", required: true },
    ],
    outputs: [{ name: "result", type: "number" }],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const base = Number(context.inputs.base);
      const exponent = Number(context.inputs.exponent);

      if (isNaN(base) || isNaN(exponent)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      return this.createSuccessResult({
        result: Math.pow(base, exponent),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
