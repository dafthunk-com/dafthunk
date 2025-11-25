import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Sentiment classification node implementation using distilbert-sst-2-int8 model
 */
export class DistilbertSst2Int8Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "distilbert-sst-2-int8",
    name: "Distilbert SST-2 Int8",
    type: "distilbert-sst-2-int8",
    description:
      "Analyzes the sentiment of text using Distilbert SST-2 Int8 model",
    tags: ["AI", "Text", "Cloudflare", "Sentiment"],
    icon: "sparkles",
    documentation:
      "This node analyzes the sentiment of text using Hugging Face's Distilbert SST-2 Int8 model.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/distilbert-sst-2-int8/",
    usage: 10,
    inputs: [
      {
        name: "text",
        type: "string",
        description: "The text to analyze for sentiment",
        required: true,
      },
    ],
    outputs: [
      {
        name: "positive",
        type: "number",
        description: "Confidence score for positive sentiment",
      },
      {
        name: "negative",
        type: "number",
        description: "Confidence score for negative sentiment",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { text } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const result = await context.env.AI.run(
        "@cf/huggingface/distilbert-sst-2-int8",
        {
          text,
        },
        context.env.AI_OPTIONS
      );

      // The model returns an array of classifications (positive and negative)
      const negative = result[0];
      const positive = result[1];
      return this.createSuccessResult({
        positive: positive.score,
        negative: negative.score,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
