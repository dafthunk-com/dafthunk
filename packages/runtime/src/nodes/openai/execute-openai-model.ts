import type { NodeContext } from "@dafthunk/runtime";
import type { NodeExecution } from "@dafthunk/types";
import OpenAI from "openai";
import { getOpenAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

/**
 * Shared execution logic for all OpenAI chat-completion nodes.
 * Centralizes client creation, API call, response extraction, usage
 * calculation, and error handling so each node only specifies its
 * model ID and pricing.
 */
export async function executeOpenAIModel(
  node: {
    createSuccessResult: (
      outputs: Record<string, unknown>,
      usage: number
    ) => NodeExecution;
    createErrorResult: (error: string) => NodeExecution;
  },
  context: NodeContext,
  modelId: string,
  pricing: TokenPricing
): Promise<NodeExecution> {
  try {
    const { instructions, input } = context.inputs;

    if (!input) {
      return node.createErrorResult("Input is required");
    }

    const client = new OpenAI({
      apiKey: "gateway-managed",
      timeout: 60000,
      ...getOpenAIConfig(context.env),
    });

    const completion = await client.chat.completions.create({
      model: modelId,
      max_tokens: 1024,
      messages: [
        ...(instructions
          ? [{ role: "system" as const, content: instructions }]
          : []),
        { role: "user" as const, content: input },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || "";

    const usage = calculateTokenUsage(
      completion.usage?.prompt_tokens ?? 0,
      completion.usage?.completion_tokens ?? 0,
      pricing
    );

    return node.createSuccessResult({ text: responseText }, usage);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      return node.createErrorResult(`OpenAI API error: ${error.message}`);
    }
    return node.createErrorResult(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
