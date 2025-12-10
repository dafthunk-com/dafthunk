import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { getAnthropicConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";
import { ExecutableNode, NodeContext } from "../types";

// https://www.anthropic.com/pricing
const PRICING: TokenPricing = {
  inputCostPerMillion: 15.0,
  outputCostPerMillion: 75.0,
};

/**
 * Claude 3 Opus node implementation using the Anthropic SDK
 * Previous generation premium model, still very capable
 */
export class Claude3OpusNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    type: "claude-3-opus",
    description: "Previous generation premium model, still very capable",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Opus"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude 3 Opus model, a previous generation premium model that is still very capable.",
    inlinable: false,
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
        name: "response",
        type: "string",
        description: "Generated text response from Claude 3 Opus",
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
        model: "claude-3-opus-latest",
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

      return this.createSuccessResult({ response: responseText }, usage);
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
