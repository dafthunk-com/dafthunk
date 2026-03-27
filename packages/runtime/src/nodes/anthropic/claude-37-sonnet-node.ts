import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeAnthropicModel } from "./execute-anthropic-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 3.0,
  outputCostPerMillion: 15.0,
};

export class Claude37SonnetNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-37-sonnet",
    name: "Claude 3.7 Sonnet",
    type: "claude-37-sonnet",
    description: "Mid-tier model between 3.5 and 4.0 generations",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Sonnet"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude 3.7 Sonnet model, a mid-tier model between 3.5 and 4.0 generations.",
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
        description: "Generated text response from Claude 3.7 Sonnet",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeAnthropicModel(
      this,
      context,
      "claude-3-7-sonnet-latest",
      PRICING
    );
  }
}
