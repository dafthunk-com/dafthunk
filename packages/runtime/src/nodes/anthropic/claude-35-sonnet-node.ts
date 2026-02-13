import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { getAnthropicConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://www.anthropic.com/pricing
const PRICING: TokenPricing = {
  inputCostPerMillion: 3.0,
  outputCostPerMillion: 15.0,
};

/**
 * Claude 3.5 Sonnet node implementation using the Anthropic SDK
 * Well-tested model with excellent performance/cost balance
 */
export class Claude35SonnetNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "claude-35-sonnet",
    name: "Claude 3.5 Sonnet",
    type: "claude-35-sonnet",
    description: "Well-tested model with excellent performance/cost balance",
    tags: ["AI", "LLM", "Anthropic", "Claude", "Sonnet"],
    icon: "sparkles",
    documentation:
      "This node uses Anthropic's Claude 3.5 Sonnet model with excellent performance/cost balance.",
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
        description: "Generated text response from Claude 3.5 Sonnet",
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
        model: "claude-3-5-sonnet-latest",
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
