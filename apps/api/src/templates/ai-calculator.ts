import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { Llama3370BInstructFastNode } from "@dafthunk/runtime/nodes/text/llama-3-3-70b-instruct-fp8-fast-node";
import type { WorkflowTemplate } from "@dafthunk/types";

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
    Llama3370BInstructFastNode.create({
      id: "ai-solver",
      name: "AI Solver",
      position: { x: 500, y: 100 },
      inputs: {
        tools: [{ type: "node", identifier: "calculator" }],
      },
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
