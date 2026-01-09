import { NodeExecution, NodeType } from "@dafthunk/types";

import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";
import { ExecutableNode, NodeContext } from "../types";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: summarization model
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.05,
  outputCostPerMillion: 0.1,
};
/**
 * Summarization node implementation using bart-large-cnn model
 */
export class BartLargeCnnNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bart-large-cnn",
    name: "BART Large CNN",
    type: "bart-large-cnn",
    description: "Summarizes text using BART-large-CNN model",
    tags: ["AI", "Text", "Cloudflare", "Summarize"],
    icon: "sparkles",
    documentation:
      "This node summarizes text using Facebook's BART-large-CNN model.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/bart-large-cnn/",
    usage: 1,
    inputs: [
      {
        name: "inputText",
        type: "string",
        description: "The text that you want the model to summarize",
        required: true,
      },
      {
        name: "maxLength",
        type: "number",
        description: "The maximum length of the generated summary in tokens",
        value: 1024,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "summary",
        type: "string",
        description: "The summarized version of the input text",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { inputText, maxLength } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const result = await context.env.AI.run(
        "@cf/facebook/bart-large-cnn",
        {
          input_text: inputText,
          max_length: maxLength,
        },
        context.env.AI_OPTIONS
      );

      // Calculate usage based on text length estimation
      const usage = calculateTokenUsage(
        inputText || "",
        result.summary || "",
        PRICING
      );

      return this.createSuccessResult({ summary: result.summary }, usage);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
