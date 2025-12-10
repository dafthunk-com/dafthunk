import { NodeExecution, NodeType } from "@dafthunk/types";
import OpenAI from "openai";

import { getOpenAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";
import { ExecutableNode, NodeContext } from "../types";

// https://openai.com/api/pricing/
const PRICING: TokenPricing = {
  inputCostPerMillion: 2.0,
  outputCostPerMillion: 8.0,
};

/**
 * GPT-4.1 node implementation using the OpenAI SDK
 * Latest GPT-4 iteration with enhanced capabilities
 */
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
        model: "gpt-4.1",
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
