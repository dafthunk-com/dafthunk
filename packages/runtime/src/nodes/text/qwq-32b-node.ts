import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://developers.cloudflare.com/workers-ai/models/qwq-32b/
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.66,
  outputCostPerMillion: 1.0,
};

/**
 * QwQ 32B Node implementation for reasoning-capable text generation.
 */

interface QwqNonStreamedOutput {
  response?: string;
  usage?: any;
}

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
    try {
      const {
        prompt,
        messages,
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

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const commonParams = {
        temperature,
        max_tokens,
        top_p,
        top_k,
        seed,
        repetition_penalty,
        frequency_penalty,
        presence_penalty,
        stream: Boolean(stream),
      };

      // Build the correct variant of the discriminated union input type:
      // Ai_Cf_Qwen_Qwq_32B_Prompt (with prompt) or Ai_Cf_Qwen_Qwq_32B_Messages (with messages)
      const params: AiModels["@cf/qwen/qwq-32b"]["inputs"] = messages
        ? { messages: JSON.parse(messages), ...commonParams }
        : { prompt, ...commonParams };

      const result = await context.env.AI.run(
        "@cf/qwen/qwq-32b",
        params,
        context.env.AI_OPTIONS
      );

      if (result instanceof ReadableStream) {
        // Handle stream response
        const reader = result.getReader();
        const decoder = new TextDecoder();
        let streamedResponse = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamedResponse += decoder.decode(value);
        }
        // Calculate usage based on text length estimation
        const usage = calculateTokenUsage(
          prompt || "",
          streamedResponse,
          PRICING
        );
        return this.createSuccessResult({ response: streamedResponse }, usage);
      } else {
        // Handle non-stream response
        const typedResult = result as QwqNonStreamedOutput;
        // Calculate usage based on text length estimation
        const usage = calculateTokenUsage(
          prompt || "",
          typedResult.response || "",
          PRICING
        );
        return this.createSuccessResult(
          { response: typedResult.response },
          usage
        );
      }
    } catch (error) {
      console.error(error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
