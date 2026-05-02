import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { SwitchForkNode } from "@dafthunk/runtime/nodes/logic/switch-fork-node";
import { SwitchJoinNode } from "@dafthunk/runtime/nodes/logic/switch-join-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { StringConcatNode } from "@dafthunk/runtime/nodes/text/string-concat-node";
import type { WorkflowTemplate } from "@dafthunk/types";

import {
  createCloudflareModelNode,
  LLAMA_3_3_70B_FP8_FAST,
} from "./cloudflare-model-template";

/** Routing pattern from Anthropic's Building Effective Agents. */
export const supportRoutingTemplate: WorkflowTemplate = {
  id: "support-routing",
  name: "Support Routing",
  description:
    "Classifies a support message with a small LLM, routes it to a specialist branch via a switch fork, and joins the branches back into a single response.",
  icon: "git-branch",
  trigger: "manual",
  tags: ["text", "ai", "logic"],
  nodes: [
    TextInputNode.create({
      id: "classifier-instructions",
      name: "Classifier Instructions",
      position: { x: 100, y: 259 },
      inputs: {
        value:
          "Classify the following customer support message into exactly one category. Respond with one lowercase word and nothing else: billing, tech, or general.\n\nMessage: ",
        rows: 4,
      },
    }),
    TextInputNode.create({
      id: "message",
      name: "Message",
      position: { x: 101, y: 73 },
      inputs: {
        value: "I was charged twice on my last invoice.",
        rows: 3,
      },
    }),
    StringConcatNode.create({
      id: "classifier-prompt",
      name: "Classifier Prompt",
      position: { x: 414, y: 279 },
    }),
    createCloudflareModelNode({
      id: "classifier",
      name: "Classifier",
      position: { x: 678, y: 310 },
      ...LLAMA_3_3_70B_FP8_FAST,
      inputs: [
        {
          name: "prompt",
          type: "string",
          description: "Classification prompt",
          required: true,
        },
        {
          name: "max_tokens",
          type: "number",
          description: "Maximum tokens to generate",
          hidden: true,
          value: 8,
        },
      ],
      outputs: [
        {
          name: "response",
          type: "string",
          description: "One-word category label",
        },
      ],
    }),
    SwitchForkNode.create({
      id: "fork",
      name: "Fork",
      position: { x: 967, y: 140 },
      inputs: {
        case_1: "billing",
        case_2: "tech",
      },
    }),
    StringConcatNode.create({
      id: "billing-tag",
      name: "Tag Billing",
      position: { x: 1277, y: 141 },
      inputs: {
        input_1: "[Billing Team] ",
      },
    }),
    StringConcatNode.create({
      id: "tech-tag",
      name: "Tag Tech",
      position: { x: 1273, y: 299 },
      inputs: {
        input_1: "[Tech Support] ",
      },
    }),
    StringConcatNode.create({
      id: "general-tag",
      name: "Tag General",
      position: { x: 1271, y: 15 },
      inputs: {
        input_1: "[General Support] ",
      },
    }),
    SwitchJoinNode.create({
      id: "join",
      name: "Join",
      position: { x: 1608, y: 122 },
    }),
    TextOutputNode.create({
      id: "routed",
      name: "Routed Message",
      position: { x: 1885, y: 127 },
    }),
  ],
  edges: [
    {
      source: "classifier-instructions",
      target: "classifier-prompt",
      sourceOutput: "value",
      targetInput: "input_1",
    },
    {
      source: "message",
      target: "classifier-prompt",
      sourceOutput: "value",
      targetInput: "input_2",
    },
    {
      source: "classifier-prompt",
      target: "classifier",
      sourceOutput: "result",
      targetInput: "prompt",
    },
    {
      source: "classifier",
      target: "fork",
      sourceOutput: "response",
      targetInput: "selector",
    },
    {
      source: "message",
      target: "fork",
      sourceOutput: "value",
      targetInput: "value",
    },
    {
      source: "fork",
      target: "billing-tag",
      sourceOutput: "case_1",
      targetInput: "input_2",
    },
    {
      source: "fork",
      target: "tech-tag",
      sourceOutput: "case_2",
      targetInput: "input_2",
    },
    {
      source: "fork",
      target: "general-tag",
      sourceOutput: "default",
      targetInput: "input_2",
    },
    {
      source: "billing-tag",
      target: "join",
      sourceOutput: "result",
      targetInput: "case_1",
    },
    {
      source: "tech-tag",
      target: "join",
      sourceOutput: "result",
      targetInput: "case_2",
    },
    {
      source: "general-tag",
      target: "join",
      sourceOutput: "result",
      targetInput: "default",
    },
    {
      source: "join",
      target: "routed",
      sourceOutput: "result",
      targetInput: "value",
    },
  ],
};
