import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { JsonOutputNode } from "@dafthunk/runtime/nodes/output/json-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

import { createCloudflareModelNode } from "./cloudflare-model-template";

export const sentimentAnalysisTemplate: WorkflowTemplate = {
  id: "sentiment-analysis",
  name: "Sentiment Analysis",
  description: "Analyze the sentiment of text",
  icon: "smile",
  trigger: "manual",
  tags: ["text", "ai", "sentiment"],
  nodes: [
    TextInputNode.create({
      id: "text-to-analyze",
      name: "Text to Analyze",
      position: { x: 100, y: 100 },
      inputs: {
        value:
          "I absolutely loved this product! It exceeded all my expectations.",
        placeholder: "Enter text here...",
        rows: 4,
      },
    }),
    createCloudflareModelNode({
      id: "sentiment-analyzer",
      name: "Sentiment Analyzer",
      position: { x: 500, y: 100 },
      model: "@cf/huggingface/distilbert-sst-2-int8",
      meta: {
        description:
          "Distilled BERT model that was finetuned on SST-2 for sentiment classification.",
        taskName: "Text Classification",
      },
      inputs: [
        {
          name: "text",
          type: "string",
          description: "The text that you want to classify",
          required: true,
        },
      ],
      outputs: [
        {
          name: "output",
          type: "json",
          description:
            "Array of classification results with `label` and `score`",
        },
      ],
    }),
    JsonOutputNode.create({
      id: "sentiment-preview",
      name: "Sentiment Scores",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    {
      source: "text-to-analyze",
      target: "sentiment-analyzer",
      sourceOutput: "value",
      targetInput: "text",
    },
    {
      source: "sentiment-analyzer",
      target: "sentiment-preview",
      sourceOutput: "output",
      targetInput: "value",
    },
  ],
};
