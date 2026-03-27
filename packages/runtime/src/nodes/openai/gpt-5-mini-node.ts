import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeOpenAIModel } from "./execute-openai-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 0.25,
  outputCostPerMillion: 2.0,
};

export class Gpt5MiniNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    type: "gpt-5-mini",
    description: "Faster, cost-effective version of GPT-5",
    tags: ["AI", "LLM", "OpenAI", "GPT"],
    icon: "sparkles",
    documentation:
      "This node uses OpenAI's GPT-5 Mini model, a faster, cost-effective version of GPT-5.",
    usage: 1,
    subscription: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for GPT-5 Mini's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for GPT-5 Mini",
        required: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "Generated text response from GPT-5 Mini",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeOpenAIModel(this, context, "gpt-5-mini", PRICING);
  }
}
