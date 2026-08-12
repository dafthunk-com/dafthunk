import type { NodeType } from "@dafthunk/types";

import { BaseAgentNode, buildAgentNodeType } from "./base-agent-node";

export class AgentClaudeOpus5Node extends BaseAgentNode {
  // https://www.anthropic.com/pricing
  protected static readonly agentConfig = {
    provider: "anthropic" as const,
    model: "claude-opus-5",
    pricing: { inputCostPerMillion: 5.0, outputCostPerMillion: 25.0 },
  };

  public static readonly nodeType: NodeType = buildAgentNodeType({
    id: "agent-claude-opus-5",
    name: "Agent Claude Opus 5",
    description:
      "AI agent powered by Claude Opus 5 that autonomously uses tools to accomplish tasks",
    tags: ["AI", "Agent", "Anthropic", "Claude", "Opus"],
    documentation:
      "This node runs a multi-turn agent loop using Claude Opus 5, the most capable model for long-horizon agentic work. The agent calls the LLM, executes tool calls, and iterates until the task is complete or the step limit is reached. Prefer it over a single-pass model node when the task needs several rounds of looking things up and acting on what it finds.",
  });
}
