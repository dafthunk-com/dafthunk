import type { NodeType } from "@dafthunk/types";

import { BaseAgentNode, buildAgentNodeType } from "./base-agent-node";

export class AgentQwen330BA3BFp8Node extends BaseAgentNode {
  // https://developers.cloudflare.com/workers-ai/platform/pricing/
  protected static readonly agentConfig = {
    provider: "workers-ai" as const,
    model: "@cf/qwen/qwen3-30b-a3b-fp8",
    pricing: { inputCostPerMillion: 0.051, outputCostPerMillion: 0.34 },
  };

  public static readonly nodeType: NodeType = buildAgentNodeType({
    id: "agent-qwen3-30b-a3b-fp8",
    name: "Agent Qwen3 30B A3B",
    description:
      "AI agent powered by Qwen3 30B A3B that autonomously uses tools to accomplish tasks",
    tags: ["AI", "Agent", "Cloudflare", "Qwen"],
    documentation:
      "This node runs a multi-turn agent loop using Qwen3 30B A3B on Cloudflare Workers AI. The agent calls the LLM, executes tool calls, and iterates until the task is complete or the step limit is reached. No external API key is required.",
  });
}
