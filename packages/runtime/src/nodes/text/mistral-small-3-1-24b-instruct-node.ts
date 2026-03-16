import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeWorkersAiTextModel } from "./execute-workers-ai-text-model";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: ~$0.011 per 1000 neurons, estimated for 24B model
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.2,
  outputCostPerMillion: 0.4,
};

/**
 * Mistral Small 3.1 24B Instruct Node implementation with function calling support
 */
export class MistralSmall31_24BInstructNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "mistral-small-3-1-24b-instruct",
    name: "Mistral Small 3.1 24B Instruct",
    type: "mistral-small-3-1-24b-instruct",
    description:
      "Generates text with function calling support using Mistral Small 3.1 24B Instruct model",
    tags: ["AI", "LLM", "Cloudflare", "Mistral"],
    icon: "sparkles",
    documentation:
      "This node generates text with function calling support using Mistral's Small 3.1 24B Instruct model.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/",
    usage: 1,
    functionCalling: true,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "The input text prompt for the LLM",
        required: true,
      },
      {
        name: "messages",
        type: "string",
        description: "JSON string of conversation messages",
        required: false,
      },
      {
        name: "tools",
        type: "json",
        description: "Array of tool references for function calling",
        hidden: true,
        value: [] as any,
      },
      {
        name: "temperature",
        type: "number",
        description: "Controls randomness in the output (0.0 to 2.0)",
        hidden: true,
        value: 0.7,
      },
      {
        name: "max_tokens",
        type: "number",
        description: "Maximum number of tokens to generate",
        hidden: true,
        value: 256,
      },
      {
        name: "top_p",
        type: "number",
        description: "Controls diversity via nucleus sampling (0.0 to 1.0)",
        hidden: true,
        value: 1.0,
      },
      {
        name: "top_k",
        type: "number",
        description: "Controls diversity via top-k sampling (1 to 50)",
        hidden: true,
        value: 40,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for deterministic generation",
        hidden: true,
      },
      {
        name: "repetition_penalty",
        type: "number",
        description: "Penalty for repeated tokens (0.0 to 2.0)",
        hidden: true,
        value: 1.0,
      },
      {
        name: "frequency_penalty",
        type: "number",
        description: "Penalty for frequency of tokens (0.0 to 2.0)",
        hidden: true,
        value: 0.0,
      },
      {
        name: "presence_penalty",
        type: "number",
        description: "Penalty for presence of tokens (0.0 to 2.0)",
        hidden: true,
        value: 0.0,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response",
      },
      {
        name: "tool_calls",
        type: "json",
        description: "Function calls made by the model",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const {
      temperature,
      max_tokens,
      top_p,
      top_k,
      seed,
      repetition_penalty,
      frequency_penalty,
      presence_penalty,
    } = context.inputs;

    return executeWorkersAiTextModel(this, context, {
      modelId: "@cf/mistralai/mistral-small-3.1-24b-instruct",
      pricing: PRICING,
      params: {
        temperature,
        max_tokens,
        top_p,
        top_k,
        seed,
        repetition_penalty,
        frequency_penalty,
        presence_penalty,
        stream: false,
      },
    });
  }
}
