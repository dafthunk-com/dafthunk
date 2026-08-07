import type { NodeType } from "@dafthunk/types";

import { BaseAgentNode, buildAgentNodeType } from "./base-agent-node";

/**
 * The keyless agent worth reaching for by default.
 *
 * Context is what decides an agent loop, not raw ability: every tool result
 * stays in the conversation for every round that follows, so the window is a
 * budget spent by the task rather than a limit on one message. At 131,072
 * tokens this holds roughly twenty fetched pages where
 * `@cf/qwen/qwen3-30b-a3b-fp8` runs out after four — and "read the top ten
 * stories and summarize each" does not fit in four at any step limit.
 *
 * Around 18% more per token than the Qwen agent, which is the price of the
 * request being possible at all.
 */
export class AgentGlm47FlashNode extends BaseAgentNode {
  // https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/
  protected static readonly agentConfig = {
    provider: "workers-ai" as const,
    model: "@cf/zai-org/glm-4.7-flash",
    pricing: { inputCostPerMillion: 0.06, outputCostPerMillion: 0.4 },
  };

  public static readonly nodeType: NodeType = buildAgentNodeType({
    id: "agent-glm-4-7-flash",
    name: "Agent GLM 4.7 Flash",
    description:
      "AI agent powered by GLM 4.7 Flash that autonomously uses tools to accomplish tasks",
    tags: ["AI", "Agent", "Cloudflare", "GLM"],
    documentation:
      "This node runs a multi-turn agent loop using GLM 4.7 Flash on Cloudflare Workers AI. The agent calls the LLM, executes tool calls, and iterates until the task is complete or the step limit is reached. Its 131,072-token context window is what makes a long chain of tool calls practical — each result stays in the conversation for every round that follows. No external API key is required.",
  });
}
