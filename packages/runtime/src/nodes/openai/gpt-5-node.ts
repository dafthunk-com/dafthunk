import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeOpenAIModel } from "./execute-openai-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 1.25,
  outputCostPerMillion: 10.0,
};

export class Gpt5Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-5",
    name: "GPT-5",
    type: "gpt-5",
    description: "Next-generation flagship model",
    tags: ["AI", "LLM", "OpenAI", "GPT"],
    icon: "sparkles",
    documentation:
      "This node uses OpenAI's GPT-5 model to generate text responses based on input prompts.",
    usage: 1,
    subscription: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for GPT-5's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for GPT-5",
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
        description: "Generated text or JSON response from GPT-5",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeOpenAIModel(this, context, "gpt-5", PRICING);
  }
}
