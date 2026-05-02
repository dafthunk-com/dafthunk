import { AgentQwen330BA3BFp8Node } from "@dafthunk/runtime/nodes/agent/agent-qwen3-30b-a3b-fp8-node";
import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

/** Autonomous-agent pattern from Anthropic's Building Effective Agents. */
export const wikiResearchAgentTemplate: WorkflowTemplate = {
  id: "wiki-research-agent",
  name: "Wiki Research Agent",
  description:
    "An autonomous agent that answers open-ended factual questions by iteratively searching Wikipedia and reasoning over dates.",
  icon: "bot",
  trigger: "manual",
  tags: ["ai", "agent"],
  nodes: [
    TextInputNode.create({
      id: "question",
      name: "Question",
      position: { x: 100, y: 300 },
      inputs: {
        value:
          "How many years ago did Switzerland join the United Nations, and which countries joined in the same year?",
        rows: 4,
      },
    }),
    AgentQwen330BA3BFp8Node.create({
      id: "agent",
      name: "Researcher",
      position: { x: 500, y: 300 },
      inputs: {
        instructions:
          "You are a research assistant. Answer the user's question by searching Wikipedia and reasoning over the snippets you receive. Refine your query if the first search is not specific enough. Use the date tools when the question involves elapsed time. Reply with a concise answer and cite the Wikipedia article titles you relied on.",
        max_steps: 10,
        tools: [
          { type: "node", identifier: "search-wikipedia" },
          { type: "node", identifier: "date-now" },
          { type: "node", identifier: "date-diff" },
        ],
      },
    }),
    TextOutputNode.create({
      id: "answer",
      name: "Answer",
      position: { x: 900, y: 300 },
    }),
  ],
  edges: [
    {
      source: "question",
      target: "agent",
      sourceOutput: "value",
      targetInput: "input",
    },
    {
      source: "agent",
      target: "answer",
      sourceOutput: "text",
      targetInput: "value",
    },
  ],
};
