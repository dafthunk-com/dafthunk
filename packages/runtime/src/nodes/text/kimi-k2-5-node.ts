import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { TokenPricing } from "../../utils/usage";
import { executeWorkersAiTextModel } from "./execute-workers-ai-text-model";

// https://developers.cloudflare.com/workers-ai/platform/pricing/
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.6,
  outputCostPerMillion: 3.0,
};

/**
 * Kimi K2.5 Node implementation with function calling support.
 * Returns OpenAI chat-completions format (not standard Workers AI format).
 */
export class KimiK25Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "kimi-k2-5",
    name: "Kimi K2.5",
    type: "kimi-k2-5",
    description:
      "Generates text with function calling support using Kimi K2.5 model",
    tags: ["AI", "LLM", "Cloudflare", "Kimi", "Moonshot", "Reasoning"],
    icon: "sparkles",
    documentation:
      "This node generates text with function calling support using the Kimi K2.5 model by Moonshot AI. It features strong reasoning capabilities, multilingual support, and tool use.",
    referenceUrl:
      "https://developers.cloudflare.com/workers-ai/models/kimi-k2.5/",
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
        description: "Controls randomness in the output (0.0 to 5.0)",
        hidden: true,
        value: 0.7,
      },
      {
        name: "max_tokens",
        type: "number",
        description:
          "Maximum number of tokens to generate (includes reasoning tokens)",
        hidden: true,
        value: 2048,
      },
      {
        name: "top_p",
        type: "number",
        description: "Controls diversity via nucleus sampling (0.0 to 1.0)",
        hidden: true,
        value: 1.0,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for deterministic generation",
        hidden: true,
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
        name: "reasoning",
        type: "string",
        description: "Model's reasoning process",
        hidden: true,
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
      seed,
      frequency_penalty,
      presence_penalty,
    } = context.inputs;

    return executeWorkersAiTextModel(this, context, {
      modelId: "@cf/moonshotai/kimi-k2.5",
      pricing: PRICING,
      params: {
        temperature,
        max_completion_tokens: max_tokens,
        top_p,
        seed,
        frequency_penalty,
        presence_penalty,
        stream: false,
      },
    });
  }
}
