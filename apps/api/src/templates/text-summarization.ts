import type { WorkflowTemplate } from "@dafthunk/types";

import { TextInputNode } from "../nodes/input/text-input-node";
import { TextPreviewNode } from "../nodes/preview/text-preview-node";
import { BartLargeCnnNode } from "../nodes/text/bart-large-cnn-node";

export const textSummarizationTemplate: WorkflowTemplate = {
  id: "text-summarization",
  name: "Text Summarization",
  description: "Summarize long text content using AI",
  icon: "file-text",
  type: "manual",
  tags: ["text", "summarization", "ai"],
  nodes: [
    TextInputNode.create({
      id: "text-to-summarize",
      name: "Text to Summarize",
      position: { x: 100, y: 100 },
      inputs: {
        value:
          "The Amazon rainforest, often called the lungs of the Earth, spans nine countries and covers approximately 5.5 million square kilometers. It contains about 10% of all species on Earth, including more than 40,000 plant species, 1,300 bird species, and 3,000 types of fish. The forest plays a crucial role in regulating the global climate by absorbing carbon dioxide and releasing oxygen. Indigenous communities have lived in harmony with the rainforest for thousands of years, developing sustainable practices for hunting, fishing, and agriculture. However, deforestation threatens this vital ecosystem, with an area roughly the size of a football field being cleared every minute.",
        placeholder: "Enter text here...",
        rows: 4,
      },
    }),
    BartLargeCnnNode.create({
      id: "text-summarizer",
      name: "Text Summarizer",
      position: { x: 500, y: 100 },
      inputs: {
        inputText: "",
        maxLength: 20,
      },
    }),
    TextPreviewNode.create({
      id: "summary-preview",
      name: "Summary",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    {
      source: "text-to-summarize",
      target: "text-summarizer",
      sourceOutput: "value",
      targetInput: "inputText",
    },
    {
      source: "text-summarizer",
      target: "summary-preview",
      sourceOutput: "summary",
      targetInput: "value",
    },
  ],
};
