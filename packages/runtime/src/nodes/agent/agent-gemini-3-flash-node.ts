import type { NodeType } from "@dafthunk/types";

import { BaseAgentNode, buildAgentNodeType } from "./base-agent-node";

export class AgentGemini3FlashNode extends BaseAgentNode {
  // https://ai.google.dev/pricing
  protected static readonly agentConfig = {
    provider: "google" as const,
    model: "gemini-3-flash-preview",
    pricing: { inputCostPerMillion: 0.5, outputCostPerMillion: 3.0 },
  };

  public static readonly nodeType: NodeType = buildAgentNodeType({
    id: "agent-gemini-3-flash",
    name: "Agent Gemini 3 Flash",
    description:
      "AI agent powered by Gemini 3 Flash with pro-level intelligence at Flash speed",
    tags: ["AI", "Agent", "Google", "Gemini"],
    documentation:
      "This node runs a multi-turn agent loop using Gemini 3 Flash. The agent calls the LLM, executes tool calls, and iterates until the task is complete or the step limit is reached.",
  });
}
