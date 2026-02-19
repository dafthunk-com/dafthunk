import type { NodeType } from "@dafthunk/types";

import { BaseAgentNode, buildAgentNodeType } from "./base-agent-node";

export class AgentGemini25FlashNode extends BaseAgentNode {
  // https://ai.google.dev/pricing
  protected static readonly agentConfig = {
    provider: "google" as const,
    model: "gemini-2.5-flash",
    pricing: { inputCostPerMillion: 0.3, outputCostPerMillion: 2.5 },
  };

  public static readonly nodeType: NodeType = buildAgentNodeType({
    id: "agent-gemini-2-5-flash",
    name: "Agent Gemini 2.5 Flash",
    description:
      "AI agent powered by Gemini 2.5 Flash that autonomously uses tools to accomplish tasks",
    tags: ["AI", "Agent", "Google", "Gemini"],
    documentation:
      "This node runs a multi-turn agent loop using Gemini 2.5 Flash. The agent calls the LLM, executes tool calls, and iterates until the task is complete or the step limit is reached.",
  });
}
