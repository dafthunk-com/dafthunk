import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../workflowTypes";

/**
 * Exponentiation node implementation - raises base to an exponent
 */
export class ExponentiationNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
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