import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeAnthropicModel } from "./execute-anthropic-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 15.0,
  outputCostPerMillion: 75.0,
};

export class Claude3OpusNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    type: "claude-3-opus",
    description: "Previous generation premium model, still very capable",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Opus"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude 3 Opus model, a previous generation premium model that is still very capable.",
    inlinable: false,
    usage: 1,
    subscription: true,
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
        description: "Generated text response from Claude 3 Opus",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeAnthropicModel(
      this,
      context,
      "claude-3-opus-latest",
      PRICING
    );
  }
}
