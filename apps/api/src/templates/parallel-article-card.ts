import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { StringConcatNode } from "@dafthunk/runtime/nodes/text/string-concat-node";
import type { Node, WorkflowTemplate } from "@dafthunk/types";

import {
  createCloudflareModelNode,
  LLAMA_3_3_70B_FP8_FAST,
} from "./cloudflare-model-template";

/** Parallelization (sectioning) pattern from Anthropic's Building Effective Agents. */
export const parallelArticleCardTemplate: WorkflowTemplate = {
  id: "parallel-article-card",
  name: "Parallel Article Card",
  description:
    "One article, three independent LLM calls running in parallel (summary, keywords, title), combined into a single article card.",
  icon: "split",
  trigger: "manual",
  tags: ["text", "ai"],
  nodes: [
    TextInputNode.create({
      id: "article",
      name: "Article",
      position: { x: 100, y: 250 },
      inputs: {
        value:
          "Remote work has transformed how small teams collaborate. Without daily commutes and rigid office hours, members trade synchronous chatter for async writing. Decisions get documented. Hiring widens beyond local zip codes. The trade-off is fewer hallway moments, so teams that thrive invest deliberately in shared rituals.",
        rows: 5,
      },
    }),
    StringConcatNode.create({
      id: "summary-prompt",
      name: "Summary Prompt",
      position: { x: 400, y: 250 },
      inputs: {
        input_1:
          "Write a one-sentence summary of the following article. Reply with the sentence and nothing else.\n\nArticle:\n",
      },
    }),
    StringConcatNode.create({
      id: "keywords-prompt",
      name: "Keywords Prompt",
      position: { x: 400, y: 50 },
      inputs: {
        input_1:
          "List 3 to 5 keywords from the following article as a comma-separated list. Reply with only the list.\n\nArticle:\n",
      },
    }),
    StringConcatNode.create({
      id: "title-prompt",
      name: "Title Prompt",
      position: { x: 400, y: 450 },
      inputs: {
        input_1:
          "Write a catchy 5-word title for the following article. Reply with only the title.\n\nArticle:\n",
      },
    }),
    createCloudflareModelNode({
      id: "summarizer",
      name: "Summarizer",
      position: { x: 700, y: 250 },
      ...LLAMA_3_3_70B_FP8_FAST,
      inputs: [
        {
          name: "prompt",
          type: "string",
          description: "Summary prompt",
          required: true,
        },
        {
          name: "max_tokens",
          type: "number",
          description: "Maximum tokens to generate",
          hidden: true,
          value: 128,
        },
      ],
      outputs: [
        {
          name: "response",
          type: "string",
          description: "One-sentence summary",
        },
      ],
    }),
    createCloudflareModelNode({
      id: "keyword-extractor",
      name: "Keyword Extractor",
      position: { x: 700, y: 50 },
      ...LLAMA_3_3_70B_FP8_FAST,
      inputs: [
        {
          name: "prompt",
          type: "string",
          description: "Keywords prompt",
          required: true,
        },
        {
          name: "max_tokens",
          type: "number",
          description: "Maximum tokens to generate",
          hidden: true,
          value: 64,
        },
      ],
      outputs: [
        {
          name: "response",
          type: "string",
          description: "Comma-separated keywords",
        },
      ],
    }),
    createCloudflareModelNode({
      id: "title-generator",
      name: "Title Generator",
      position: { x: 700, y: 450 },
      ...LLAMA_3_3_70B_FP8_FAST,
      inputs: [
        {
          name: "prompt",
          type: "string",
          description: "Title prompt",
          required: true,
        },
        {
          name: "max_tokens",
          type: "number",
          description: "Maximum tokens to generate",
          hidden: true,
          value: 32,
        },
      ],
      outputs: [
        {
          name: "response",
          type: "string",
          description: "Catchy title",
        },
      ],
    }),
    {
      id: "card",
      name: "Article Card",
      type: "string-concat",
      icon: "link",
      position: { x: 1000, y: 250 },
      inputs: [
        {
          name: "input_1",
          type: "string",
          description: "Summary label",
          value: "Summary: ",
        },
        { name: "input_2", type: "string", description: "Summary text" },
        {
          name: "input_3",
          type: "string",
          description: "Keywords label",
          value: "\n\nKeywords: ",
        },
        { name: "input_4", type: "string", description: "Keywords text" },
        {
          name: "input_5",
          type: "string",
          description: "Title label",
          value: "\n\nTitle: ",
        },
        { name: "input_6", type: "string", description: "Title text" },
      ],
      outputs: [
        {
          name: "result",
          type: "string",
          description: "Combined article card",
        },
      ],
    } satisfies Node,
    TextOutputNode.create({
      id: "card-output",
      name: "Card",
      position: { x: 1300, y: 250 },
    }),
  ],
  edges: [
    {
      source: "article",
      target: "summary-prompt",
      sourceOutput: "value",
      targetInput: "input_2",
    },
    {
      source: "article",
      target: "keywords-prompt",
      sourceOutput: "value",
      targetInput: "input_2",
    },
    {
      source: "article",
      target: "title-prompt",
      sourceOutput: "value",
      targetInput: "input_2",
    },
    {
      source: "summary-prompt",
      target: "summarizer",
      sourceOutput: "result",
      targetInput: "prompt",
    },
    {
      source: "keywords-prompt",
      target: "keyword-extractor",
      sourceOutput: "result",
      targetInput: "prompt",
    },
    {
      source: "title-prompt",
      target: "title-generator",
      sourceOutput: "result",
      targetInput: "prompt",
    },
    {
      source: "summarizer",
      target: "card",
      sourceOutput: "response",
      targetInput: "input_2",
    },
    {
      source: "keyword-extractor",
      target: "card",
      sourceOutput: "response",
      targetInput: "input_4",
    },
    {
      source: "title-generator",
      target: "card",
      sourceOutput: "response",
      targetInput: "input_6",
    },
    {
      source: "card",
      target: "card-output",
      sourceOutput: "result",
      targetInput: "value",
    },
  ],
};
