import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../workflowTypes";

/**
 * LLM node implementation
 */
export class LLMNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const prompt = context.inputs.prompt;

      if (!prompt || typeof prompt !== "string") {
        return this.createErrorResult(
          "Prompt is required and must be a string"
        );
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const result = await context.env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          prompt,
        }
      );

      return this.createSuccessResult({
        result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
