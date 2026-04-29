import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

import { createCloudflareModelNode } from "./cloudflare-model-template";

export const aiCalculatorTemplate: WorkflowTemplate = {
  id: "ai-calculator",
  name: "AI Calculator",
  description: "Use AI with a calculator tool to solve math problems",
  icon: "calculator",
  trigger: "manual",
  tags: ["ai"],
  nodes: [
    TextInputNode.create({
      id: "problem-input",
      name: "Problem",
      position: { x: 100, y: 100 },
      inputs: {
        value:
          "I throw a ball straight up into the air with an initial speed of 20 meters per second. How high will it go before it starts falling back down, and how long will it take to reach that highest point? Assume gravity is 9.81 m/s².",
      },
    }),
    createCloudflareModelNode({
      id: "ai-solver",
      name: "AI Solver",
      position: { x: 500, y: 100 },
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      functionCalling: true,
      meta: {
        description:
          "Llama 3.3 70B quantized to fp8 with function calling support, optimized for fast inference.",
        taskName: "Text Generation",
      },
      inputs: [
        {
          name: "prompt",
          type: "string",
          description: "Problem statement to solve",
          required: true,
        },
        {
          name: "tools",
          type: "json",
          description: "Tool references for function calling",
          hidden: true,
          // Tool refs are a JsonArray, but our `json` Parameter declares
          // value as JsonObject. The runtime accepts arrays here, so cast
          // through `unknown` to satisfy the static type.
          value: [
            { type: "node", identifier: "calculator" },
          ] as unknown as Record<string, never>,
        },
      ],
      outputs: [
        {
          name: "response",
          type: "any",
          description: "Generated text response",
        },
        {
          name: "tool_calls",
          type: "json",
          description: "Function calls executed during the run",
          hidden: true,
        },
      ],
    }),
    TextOutputNode.create({
      id: "solution-preview",
      name: "Solution",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    {
      source: "problem-input",
      target: "ai-solver",
      sourceOutput: "value",
      targetInput: "prompt",
    },
    {
      source: "ai-solver",
      target: "solution-preview",
      sourceOutput: "response",
      targetInput: "value",
    },
  ],
};
