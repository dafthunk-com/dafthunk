import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult } from "../../workflowModel";
import { NodeContext } from "@lib/workflowRuntime";

/**
 * Simplified LLM node implementation with essential parameters
 */
export class LLMNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { prompt, seed, temperature } = context.inputs;

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
          seed,
          temperature,
        }
      );

      return this.createSuccessResult({
        response: result.response,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
