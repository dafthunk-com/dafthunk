import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { StringConcatNode } from "@dafthunk/runtime/nodes/text/string-concat-node";
import type { WorkflowTemplate } from "@dafthunk/types";

import {
  createCloudflareModelNode,
  LLAMA_3_3_70B_FP8_FAST,
} from "./cloudflare-model-template";

/**
 * Prompt-chaining example from Anthropic's Building Effective Agents:
 * write an outline, then write the full article from the outline.
 */
export const outlineAndWriteTemplate: WorkflowTemplate = {
  id: "outline-and-write",
  name: "Outline and Write",
  description:
    "Two LLM calls in sequence. The first writes an outline. The second writes the article from the outline.",
  icon: "list-ordered",
  trigger: "manual",
  tags: ["text", "ai"],
  nodes: [
    TextInputNode.create({
      id: "topic",
      name: "Topic",
      position: { x: 100, y: 350 },
      inputs: {
        value: "the benefits of remote work for small teams",
        placeholder: "Enter a topic...",
        rows: 2,
      },
    }),
    TextInputNode.create({
      id: "outline-instructions",
      name: "Outline Instructions",
      position: { x: 100, y: 50 },
      inputs: {
        value:
          "Write a 5-point outline for a short article on the following topic.\n\nTopic: ",
        rows: 4,
      },
    }),
    StringConcatNode.create({
      id: "outline-prompt",
      name: "Outline Prompt",
      position: { x: 400, y: 200 },
    }),
    createCloudflareModelNode({
      id: "outliner",
      name: "Outliner",
      position: { x: 700, y: 350 },
      ...LLAMA_3_3_70B_FP8_FAST,
      inputs: [
        {
          name: "prompt",
          type: "string",
          description: "Outline-writing prompt",
          required: true,
        },
        {
          name: "max_tokens",
          type: "number",
          description: "Maximum tokens to generate",
          hidden: true,
          value: 1024,
        },
      ],
      outputs: [
        {
          name: "response",
          type: "string",
          description: "Bullet-point outline",
        },
      ],
    }),
    TextInputNode.create({
      id: "writer-instructions",
      name: "Writer Instructions",
      position: { x: 700, y: 50 },
      inputs: {
        value:
          "Write a 3-paragraph article based on the following outline. Plain prose, no headings.\n\nOutline:\n",
        rows: 4,
      },
    }),
    StringConcatNode.create({
      id: "writer-prompt",
      name: "Writer Prompt",
      position: { x: 1000, y: 200 },
    }),
    createCloudflareModelNode({
      id: "writer",
      name: "Writer",
      position: { x: 1300, y: 350 },
      ...LLAMA_3_3_70B_FP8_FAST,
      inputs: [
        {
          name: "prompt",
          type: "string",
          description: "Article-writing prompt",
          required: true,
        },
        {
          name: "max_tokens",
          type: "number",
          description: "Maximum tokens to generate",
          hidden: true,
          value: 2048,
        },
      ],
      outputs: [
        {
          name: "response",
          type: "string",
          description: "Final article",
        },
      ],
    }),
    TextOutputNode.create({
      id: "article",
      name: "Article",
      position: { x: 1600, y: 350 },
    }),
  ],
  edges: [
    {
      source: "outline-instructions",
      target: "outline-prompt",
      sourceOutput: "value",
      targetInput: "input_1",
    },
    {
      source: "topic",
      target: "outline-prompt",
      sourceOutput: "value",
      targetInput: "input_2",
    },
    {
      source: "outline-prompt",
      target: "outliner",
      sourceOutput: "result",
      targetInput: "prompt",
    },
    {
      source: "writer-instructions",
      target: "writer-prompt",
      sourceOutput: "value",
      targetInput: "input_1",
    },
    {
      source: "outliner",
      target: "writer-prompt",
      sourceOutput: "response",
      targetInput: "input_2",
    },
    {
      source: "writer-prompt",
      target: "writer",
      sourceOutput: "result",
      targetInput: "prompt",
    },
    {
      source: "writer",
      target: "article",
      sourceOutput: "response",
      targetInput: "value",
    },
  ],
};
