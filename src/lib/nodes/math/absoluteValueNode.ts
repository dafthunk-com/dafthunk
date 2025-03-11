import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult } from "../../workflowModel.ts";
import { NodeContext } from "@lib/workflowRuntime.ts";

/**
 * Absolute Value node implementation
 */
export class AbsoluteValueNode extends BaseExecutableNode {
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
