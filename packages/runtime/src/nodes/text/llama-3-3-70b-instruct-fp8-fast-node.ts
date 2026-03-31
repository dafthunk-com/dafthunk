import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeWorkersAiTextModel } from "./execute-workers-ai-text-model";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Cloudflare Workers AI: ~$0.011 per 1000 neurons, estimated for 70B model
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.35,
  outputCostPerMillion: 0.75,
};

/**
 * Llama 3.3 70B Instruct Fast Node implementation with comprehensive parameters
 */
export class Llama3370BInstructFastNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "llama-3-3-70b-instruct-fp8-fast",
    name: "Llama 3.3 70B Instruct Fast",
    type: "llama-3-3-70b-instruct-fp8-fast",
    description:
      "Generates text using Llama 3.3 70B Instruct Fast model with fp8 precision",
    tags: ["AI", "LLM", "Cloudflare", "Llama"],
    icon: "sparkles",
    documentation:
      "This node generates text using Meta's Llama 3.3 70B Instruct Fast model with fp8 precision and function calling capabilities.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/",
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
        name: "temperature",
        type: "number",
        description: "Controls randomness in the output (0.0 to 5.0)",
        hidden: true,
        value: 0.6,
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
        description: "Controls diversity via nucleus sampling (0.0 to 2.0)",
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
      {
        name: "tools",
        type: "json",
        description: "Array of tool references for function calling",
        hidden: true,
        value: [] as any,
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
        name: "response",
        type: "any",
        description: "Generated text or JSON response",
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
      modelId: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
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
