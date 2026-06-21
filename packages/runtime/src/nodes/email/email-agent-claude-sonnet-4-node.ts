import type { NodeType } from "@dafthunk/types";

import {
  BaseEmailAgentNode,
  buildEmailAgentNodeType,
} from "./base-email-agent-node";

export class EmailAgentClaudeSonnet4Node extends BaseEmailAgentNode {
  // https://www.anthropic.com/pricing
  protected static readonly agentConfig = {
    provider: "anthropic" as const,
    model: "claude-sonnet-4-0",
    pricing: { inputCostPerMillion: 3.0, outputCostPerMillion: 15.0 },
  };

  public static readonly nodeType: NodeType = buildEmailAgentNodeType({
    id: "email-agent-claude-sonnet-4",
    name: "Email Agent Claude Sonnet 4",
    description:
      "AI agent that emails one or more interlocutors and waits for their replies, looping until a goal is reached",
    tags: ["AI", "Agent", "Email", "Anthropic", "Claude"],
    documentation:
      "This node runs an agent that coordinates with people over email to accomplish an objective. It can question several interlocutors in parallel and pauses the workflow — for days if needed — until replies arrive, resuming automatically. When the objective is met it returns the result and a transcript of the conversation. Requires durable workflow execution.",
    subscription: true,
  });
}
