import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeOpenAIModel } from "./execute-openai-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 0.05,
  outputCostPerMillion: 0.4,
};

export class Gpt5NanoNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    type: "gpt-5-nano",
    description: "Ultra-lightweight, high-speed model",
    tags: ["AI", "LLM", "OpenAI", "GPT"],
    icon: "zap",
    documentation:
      "This node uses OpenAI's GPT-5 Nano model, an ultra-lightweight, high-speed model.",
    usage: 1,
    subscription: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for GPT-5 Nano's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for GPT-5 Nano",
        required: true,
      },
      {
        name: "schema",
        type: "schema",
        description: "JSON schema to constrain the output format",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "any",
        description: "Generated text or JSON response from GPT-5 Nano",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeOpenAIModel(this, context, "gpt-5-nano", PRICING);
  }
}
