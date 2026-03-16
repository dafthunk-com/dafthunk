import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeWorkersAiTextModel } from "./execute-workers-ai-text-model";

// https://developers.cloudflare.com/workers-ai/models/qwq-32b/
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.66,
  outputCostPerMillion: 1.0,
};

/**
 * QwQ 32B Node implementation for reasoning-capable text generation.
 */
export class Qwq32BNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "qwq-32b",
    name: "QwQ 32B",
    type: "qwq-32b",
    description:
      "Generates text with reasoning capabilities using the QwQ 32B model",
    tags: ["AI", "LLM", "Cloudflare", "Qwen", "Reasoning"],
    icon: "sparkles",
    documentation:
      "This node generates text with reasoning capabilities using the QwQ 32B model. A specialized reasoning model from the Qwen series designed for complex problem-solving. It features a 24,000 token context window and is capable of step-by-step reasoning to deliver enhanced performance on hard problems.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/qwq-32b/",
    usage: 1,
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
        value: 2048,
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
        description: "Limits to top k most probable words (1 to 50)",
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
        name: "stream",
        type: "number",
        description: "Whether to stream the response",
        hidden: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "response",
        type: "string",
        description: "Generated text response",
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
      stream,
    } = context.inputs;

    return executeWorkersAiTextModel(this, context, {
      modelId: "@cf/qwen/qwq-32b",
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
        stream: Boolean(stream),
      },
    });
  }
}
