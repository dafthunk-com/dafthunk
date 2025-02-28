import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../workflowTypes";

/**
 * LLM node implementation
 */
export class LLMNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const prompt = Number(context.inputs.prompt);
      // TODO: Check if the temperature is within the valid range

      return this.createSuccessResult({
        result: context.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          prompt,
        }),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
