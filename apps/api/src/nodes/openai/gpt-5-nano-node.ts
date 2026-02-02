import { NodeExecution, NodeType } from "@dafthunk/types";
import OpenAI from "openai";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { getOpenAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://openai.com/api/pricing/
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.05,
  outputCostPerMillion: 0.4,
};

/**
 * GPT-5 Nano node implementation using the OpenAI SDK
 * Ultra-lightweight, high-speed model
 */
export class Gpt5NanoNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    type: "gpt-5-nano",
    description: "Ultra-lightweight, high-speed model",
    tags: ["AI", "LLM", "OpenAI", "GPT"],
    icon: "zap",
    documentation:
      "This node uses OpenAI's GPT-5 Nano model, an ultra-lightweight, high-speed model.",
    usage: 1,
    inputs: [
      {
        name: "instructions",
        type: "string",
        description: "System instructions for GPT-5 Nano's behavior",
        required: false,
        value: "You are a helpful assistant.",
      },
      {
        name: "input",
        type: "string",
        description: "The input text or question for GPT-5 Nano",
        required: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "Generated text response from GPT-5 Nano",
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
      const client = new OpenAI({
        apiKey: "gateway-managed",
        timeout: 60000,
        ...getOpenAIConfig(context.env),
      });

      const completion = await client.chat.completions.create({
        model: "gpt-5-nano",
        max_tokens: 1024,
        messages: [
          ...(instructions
            ? [{ role: "system" as const, content: instructions }]
            : []),
          { role: "user" as const, content: input },
        ],
      });

      const responseText = completion.choices[0]?.message?.content || "";

      // Calculate dynamic usage based on actual token consumption
      const usage = calculateTokenUsage(
        completion.usage?.prompt_tokens ?? 0,
        completion.usage?.completion_tokens ?? 0,
        PRICING
      );

      return this.createSuccessResult({ text: responseText }, usage);
    } catch (error) {
      console.error(error);
      if (error instanceof OpenAI.APIError) {
        return this.createErrorResult(`OpenAI API error: ${error.message}`);
      }
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
