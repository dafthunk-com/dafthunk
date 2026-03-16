import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeAnthropicModel } from "./execute-anthropic-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 15.0,
  outputCostPerMillion: 75.0,
};

export class ClaudeOpus4Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-opus-4",
    name: "Claude Opus 4",
    type: "claude-opus-4",
    description:
      "Most powerful Claude 4 model for complex reasoning and advanced analysis",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Opus"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude Opus 4 model, the most powerful Claude 4 model for complex reasoning and advanced analysis.",
    usage: 1,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for Claude's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for Claude",
        required: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "Generated text response from Claude Opus 4",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeAnthropicModel(this, context, "claude-opus-4-0", PRICING);
  }
}
