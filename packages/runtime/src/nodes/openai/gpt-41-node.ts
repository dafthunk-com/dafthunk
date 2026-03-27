import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeOpenAIModel } from "./execute-openai-model";

const PRICING: TokenPricing = {
  inputCostPerMillion: 2.0,
  outputCostPerMillion: 8.0,
};

export class Gpt41Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-4.1",
    name: "GPT-4.1",
    type: "gpt-4.1",
    description: "Latest GPT-4 iteration with enhanced capabilities",
    tags: ["AI", "LLM", "OpenAI", "GPT"],
    icon: "sparkles",
    documentation:
      "This node uses OpenAI's GPT-4.1 model, the latest GPT-4 iteration with enhanced capabilities.",
    usage: 1,
    subscription: true,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for GPT-4.1's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for GPT-4.1",
        required: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "Generated text response from GPT-4.1",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return executeOpenAIModel(this, context, "gpt-4.1", PRICING);
  }
}
