import type { WorkflowTemplate } from "@dafthunk/types";

import { BartLargeCnnNode } from "../nodes/text/bart-large-cnn-node";
import { TextAreaNode } from "../nodes/text/text-area-node";

export const textSummarizationTemplate: WorkflowTemplate = {
  id: "text-summarization",
  name: "Text Summarization",
  description: "Summarize long text content using AI",
  category: "text-processing",
  type: "manual",
  tags: ["ai", "text", "summarization"],
  nodes: [
    TextAreaNode.create({
      id: "input-1",
      position: { x: 100, y: 100 },
      description: "Enter text to summarize",
      inputs: { placeholder: "Enter text to summarize...", rows: 6 },
    }),
    BartLargeCnnNode.create({
      id: "summarizer-1",
      position: { x: 500, y: 100 },
      description: "AI summarization model",
    }),
  ],
  edges: [
    {
      source: "input-1",
      target: "summarizer-1",
      sourceOutput: "value",
      targetInput: "inputText",
    },
  ],
};
