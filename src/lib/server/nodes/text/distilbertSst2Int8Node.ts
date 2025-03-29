import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../runtime/types";
import { NodeType } from "../types";
import { NumberParameter, StringParameter } from "../types";
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
    category: "Text",
    icon: "mood",
    inputs: [
      {
        name: "text",
        type: StringParameter,
        description: "The text to analyze for sentiment",
        required: true,
      },
    ],
    outputs: [
      {
        name: "positive",
        type: NumberParameter,
        description: "Confidence score for positive sentiment",
      },
      {
        name: "negative",
        type: NumberParameter,
        description: "Confidence score for negative sentiment",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { text } = context.inputs;

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
        positive: new NumberParameter(positive.score),
        negative: new NumberParameter(negative.score),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
