import type { NodeType } from "@dafthunk/types";

import { BaseAgentNode, buildAgentNodeType } from "./base-agent-node";

export class AgentGpt41Node extends BaseAgentNode {
  // https://openai.com/api/pricing/
  protected static readonly agentConfig = {
    provider: "openai" as const,
    model: "gpt-4.1",
    pricing: { inputCostPerMillion: 2.0, outputCostPerMillion: 8.0 },
  };

  public static readonly nodeType: NodeType = buildAgentNodeType({
    id: "agent-gpt-4.1",
    name: "Agent GPT-4.1",
    description:
      "AI agent powered by GPT-4.1 that autonomously uses tools to accomplish tasks",
    tags: ["AI", "Agent", "OpenAI", "GPT"],
    documentation:
      "This node runs a multi-turn agent loop using GPT-4.1. The agent calls the LLM, executes tool calls, and iterates until the task is complete or the step limit is reached.",
  });
}
