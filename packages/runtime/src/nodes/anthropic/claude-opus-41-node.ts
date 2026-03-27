import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeAnthropicModel } from "./execute-anthropic-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 15.0,
  outputCostPerMillion: 75.0,
};

export class ClaudeOpus41Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-opus-41",
    name: "Claude Opus 4.1",
    type: "claude-opus-41",
    description: "Most advanced Claude model with latest capabilities",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Opus"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude Opus 4.1 model, the most advanced Claude model with latest capabilities.",
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
        description: "Generated text response from Claude Opus 4.1",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeAnthropicModel(this, context, "claude-opus-4-1", PRICING);
  }
}
