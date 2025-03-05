import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../workflowTypes";

/**
 * Sentiment classification node implementation using distilbert-sst-2-int8 model
 */
export class SentimentNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const text = context.inputs.text;

      if (!text || typeof text !== "string") {
        return this.createErrorResult(
          "Input text is required and must be a string"
        );
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const result = await context.env.AI.run(
        "@cf/huggingface/distilbert-sst-2-int8",
        {
          text
        }
      );

      // The model returns an array of classifications, we take the first one
      const classification = result[0];

      return this.createSuccessResult({
        label: classification.label,
        score: classification.score
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
} 