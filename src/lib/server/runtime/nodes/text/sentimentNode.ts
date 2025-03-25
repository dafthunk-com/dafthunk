import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * Sentiment classification node implementation using distilbert-sst-2-int8 model
 */
export class SentimentNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "sentiment",
    name: "Sentiment Analysis",
    type: "sentiment",
    description: "Analyzes the sentiment of text",
    category: "Text",
    icon: "mood",
    inputs: [
      {
        name: "text",
        type: "string",
        description: "The text to analyze for sentiment",
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
          text,
        }
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
