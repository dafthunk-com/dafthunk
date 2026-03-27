import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeAnthropicModel } from "./execute-anthropic-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 3.0,
  outputCostPerMillion: 15.0,
};

export class ClaudeSonnet4Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    type: "claude-sonnet-4",
    description: "Latest Claude Sonnet model with advanced capabilities",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Sonnet"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude Sonnet 4 model to generate text responses based on input prompts.",
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
        description: "Generated text response from Claude Sonnet 4",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeAnthropicModel(this, context, "claude-sonnet-4-0", PRICING);
  }
}
