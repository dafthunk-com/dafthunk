import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { VarStringTemplateNode } from "@dafthunk/runtime/nodes/text/var-string-template-node";
import type { WorkflowTemplate } from "@dafthunk/types";

import {
  createCloudflareModelNode,
  LLAMA_3_3_70B_FP8_FAST,
} from "./cloudflare-model-template";

export const textSummarizationTemplate: WorkflowTemplate = {
  id: "text-summarization",
  name: "Text Summarization",
  description: "Summarize long text content using AI",
  icon: "file-text",
  trigger: "manual",
  tags: ["text", "ai"],
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
    // Workers AI retired its dedicated Summarization task with
    // @cf/facebook/bart-large-cnn on 2026-05-30, so summarizing is now an
    // instruction to a general text model. Building the prompt in its own node
    // keeps that instruction visible and editable instead of burying it in a
    // default value the first edit would overwrite.
    VarStringTemplateNode.create({
      id: "summary-prompt",
      name: "Summary Prompt",
      position: { x: 500, y: 100 },
      inputs: {
        // Text first, instruction last, trailing "Summary:" label. Leading the
        // prompt with the instruction makes the model continue the article
        // instead of condensing it.
        template:
          'Text:\n"""\n${var_1}\n"""\n\nWrite a summary of the text above in two sentences. Output only the summary.\n\nSummary:',
      },
    }),
    createCloudflareModelNode({
      id: "text-summarizer",
      name: "Text Summarizer",
      position: { x: 900, y: 100 },
      ...LLAMA_3_3_70B_FP8_FAST,
      inputs: [
        {
          name: "prompt",
          type: "string",
          description: "Summarization instruction and the text to summarize",
          required: true,
        },
        {
          name: "max_tokens",
          type: "number",
          description: "Maximum length of the generated summary (in tokens)",
          hidden: true,
          value: 256,
        },
      ],
      outputs: [
        {
          name: "response",
          type: "string",
          description: "Summarized version of the input text",
        },
      ],
    }),
    TextOutputNode.create({
      id: "summary-preview",
      name: "Summary",
      position: { x: 1300, y: 100 },
    }),
  ],
  edges: [
    {
      source: "text-to-summarize",
      target: "summary-prompt",
      sourceOutput: "value",
      targetInput: "var_1",
    },
    {
      source: "summary-prompt",
      target: "text-summarizer",
      sourceOutput: "result",
      targetInput: "prompt",
    },
    {
      source: "text-summarizer",
      target: "summary-preview",
      sourceOutput: "response",
      targetInput: "value",
    },
  ],
};
