import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeAnthropicModel } from "./execute-anthropic-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 0.8,
  outputCostPerMillion: 4.0,
};

export class Claude35HaikuNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-35-haiku",
    name: "Claude 3.5 Haiku",
    type: "claude-35-haiku",
    description: "Fastest Claude model for simple tasks and high-volume usage",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Haiku"],
    icon: "zap",
    documentation:
      "This node uses Anthropic's Claude 3.5 Haiku model for fast, simple tasks and high-volume usage.",
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
        description: "Generated text response from Claude 3.5 Haiku",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeAnthropicModel(
      this,
      context,
      "claude-3-5-haiku-latest",
      PRICING
    );
  }
}
