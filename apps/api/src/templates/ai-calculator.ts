import type { WorkflowTemplate } from "@dafthunk/types";

import { TextInputNode } from "../nodes/input/text-input-node";
import { TextPreviewNode } from "../nodes/preview/text-preview-node";
import { Llama3370BInstructFastNode } from "../nodes/text/llama-3-3-70b-instruct-fp8-fast-node";

export const aiCalculatorTemplate: WorkflowTemplate = {
  id: "ai-calculator",
  name: "AI Calculator",
  description: "Use AI with a calculator tool to solve math problems",
  icon: "calculator",
  type: "manual",
  tags: ["ai", "math", "tools", "llm"],
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
    Llama3370BInstructFastNode.create({
      id: "ai-solver",
      name: "AI Solver",
      position: { x: 500, y: 100 },
      inputs: {
        tools: [{ type: "node", identifier: "calculator" }],
      },
    }),
    TextPreviewNode.create({
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
