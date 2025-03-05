import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../workflowTypes";

/**
 * LLM node implementation
 */
export class LLMNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const prompt = context.inputs.prompt;
      const seed = context.inputs.seed;
      const temperature = context.inputs.temperature;
      const topP = context.inputs.topP;
      const topK = context.inputs.topK;
      const maxTokens = context.inputs.maxTokens;
      const presencePenalty = context.inputs.presencePenalty;
      const repetitionPenalty = context.inputs.repetitionPenalty;
      
      if (!prompt || typeof prompt !== "string") {
        return this.createErrorResult(
          "Prompt is required and must be a string"
        );
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const result = await context.env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          prompt,
          temperature,
          seed,
          topP,
          topK,
          maxTokens,
          presencePenalty,
          repetitionPenalty,
        }
      );

      return this.createSuccessResult({
        response: result.response,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
