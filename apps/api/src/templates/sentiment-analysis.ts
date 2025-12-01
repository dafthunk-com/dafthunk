import type { WorkflowTemplate } from "@dafthunk/types";

import { TextInputNode } from "../nodes/input/text-input-node";
import { NumberOutputNode } from "../nodes/output/number-output-node";
import { DistilbertSst2Int8Node } from "../nodes/text/distilbert-sst-2-int8-node";

export const sentimentAnalysisTemplate: WorkflowTemplate = {
  id: "sentiment-analysis",
  name: "Sentiment Analysis",
  description: "Analyze the sentiment of text",
  icon: "smile",
  type: "manual",
  tags: ["text", "sentiment", "ai"],
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
    DistilbertSst2Int8Node.create({
      id: "sentiment-analyzer",
      name: "Sentiment Analyzer",
      position: { x: 500, y: 100 },
    }),
    NumberOutputNode.create({
      id: "positive-score-preview",
      name: "Positive Score",
      position: { x: 900, y: 50 },
    }),
    NumberOutputNode.create({
      id: "negative-score-preview",
      name: "Negative Score",
      position: { x: 900, y: 200 },
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
      target: "positive-score-preview",
      sourceOutput: "positive",
      targetInput: "value",
    },
    {
      source: "sentiment-analyzer",
      target: "negative-score-preview",
      sourceOutput: "negative",
      targetInput: "value",
    },
  ],
};
