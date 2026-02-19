import type { NodeType } from "@dafthunk/types";

import { BaseAgentNode, buildAgentNodeType } from "./base-agent-node";

export class AgentClaudeSonnet4Node extends BaseAgentNode {
  // https://www.anthropic.com/pricing
  protected static readonly agentConfig = {
    provider: "anthropic" as const,
    model: "claude-sonnet-4-0",
    pricing: { inputCostPerMillion: 3.0, outputCostPerMillion: 15.0 },
  };

  public static readonly nodeType: NodeType = buildAgentNodeType({
    id: "agent-claude-sonnet-4",
    name: "Agent Claude Sonnet 4",
    description:
      "AI agent powered by Claude Sonnet 4 that autonomously uses tools to accomplish tasks",
    tags: ["AI", "Agent", "Anthropic", "Claude", "Sonnet"],
    documentation:
      "This node runs a multi-turn agent loop using Claude Sonnet 4. The agent calls the LLM, executes tool calls, and iterates until the task is complete or the step limit is reached.",
  });
}
