import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { getAnthropicConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";
import { ExecutableNode, NodeContext } from "../types";

// https://www.anthropic.com/pricing
const PRICING: TokenPricing = {
  inputCostPerMillion: 3.0,
  outputCostPerMillion: 15.0,
};

/**
 * Claude Sonnet 4 node implementation using the Anthropic SDK
 * Latest generation Sonnet model with advanced capabilities
 */
export class ClaudeSonnet4Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    type: "claude-sonnet-4",
    description: "Latest Claude Sonnet model with advanced capabilities",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Sonnet"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude Sonnet 4 model to generate text responses based on input prompts.",
    usage: 1,
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
        description: "Generated text response from Claude Sonnet 4",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { instructions, input } = context.inputs;

      if (!input) {
        return this.createErrorResult("Input is required");
      }

      // API key is injected by AI Gateway via BYOK (Bring Your Own Keys)
      const client = new Anthropic({
        apiKey: "gateway-managed",
        timeout: 60000,
        ...getAnthropicConfig(context.env),
      });

      const response = await client.messages.create({
        model: "claude-sonnet-4-0",
        max_tokens: 1024,
        messages: [{ role: "user", content: input }],
        ...(instructions && { system: instructions }),
      });

      const responseText = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      const usage = calculateTokenUsage(
        response.usage.input_tokens,
        response.usage.output_tokens,
        PRICING
      );

      return this.createSuccessResult({ text: responseText }, usage);
    } catch (error) {
      console.error(error);
      if (error instanceof APIError) {
        return this.createErrorResult(`Claude API error: ${error.message}`);
      }
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
