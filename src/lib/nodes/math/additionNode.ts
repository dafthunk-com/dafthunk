import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult } from "../../workflowTypes";
import { NodeContext } from "@lib/workflowRuntime.ts";

/**
 * Addition node implementation
 */
export class AdditionNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const a = Number(context.inputs.a);
      const b = Number(context.inputs.b);

      if (isNaN(a) || isNaN(b)) {
        return this.createErrorResult("Both inputs must be numbers");
      }

      return this.createSuccessResult({
        result: a + b,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
