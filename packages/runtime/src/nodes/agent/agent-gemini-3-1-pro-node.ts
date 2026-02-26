import type { NodeType } from "@dafthunk/types";

import { BaseAgentNode, buildAgentNodeType } from "./base-agent-node";

export class AgentGemini31ProNode extends BaseAgentNode {
  // https://ai.google.dev/pricing
  protected static readonly agentConfig = {
    provider: "google" as const,
    model: "gemini-3.1-pro-preview",
    pricing: { inputCostPerMillion: 2.0, outputCostPerMillion: 12.0 },
  };

  public static readonly nodeType: NodeType = buildAgentNodeType({
    id: "agent-gemini-3-1-pro",
    name: "Agent Gemini 3.1 Pro",
    description:
      "AI agent powered by Gemini 3.1 Pro for complex reasoning and creative tasks",
    tags: ["AI", "Agent", "Google", "Gemini"],
    documentation:
      "This node runs a multi-turn agent loop using Gemini 3.1 Pro. The agent calls the LLM, executes tool calls, and iterates until the task is complete or the step limit is reached.",
  });
}
