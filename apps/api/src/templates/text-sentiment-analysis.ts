import type { WorkflowTemplate } from "@dafthunk/types";

import { DistilbertSst2Int8Node } from "../nodes/text/distilbert-sst-2-int8-node";
import { TextAreaNode } from "../nodes/text/text-area-node";

export const textSentimentAnalysisTemplate: WorkflowTemplate = {
  id: "text-sentiment-analysis",
  name: "Text Sentiment Analysis",
  description: "Analyze the sentiment of text",
  category: "text-processing",
  type: "manual",
  tags: ["text", "sentiment", "ai"],
  nodes: [
    TextAreaNode.create({
      id: "input-1",
      position: { x: 100, y: 100 },
      description: "Text to analyze",
      inputs: { placeholder: "Enter text here...", rows: 4 },
    }),
    DistilbertSst2Int8Node.create({
      id: "analyzer-1",
      position: { x: 500, y: 100 },
      description: "Analyze sentiment",
    }),
  ],
  edges: [
    {
      source: "input-1",
      target: "analyzer-1",
      sourceOutput: "value",
      targetInput: "text",
    },
  ],
};
