import Anthropic, { APIError } from "@anthropic-ai/sdk";
import type { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import type { NodeExecution } from "@dafthunk/types";
import { getAnthropicConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

/**
 * Shared execution logic for all Anthropic text-generation nodes.
 * Centralizes client creation, API call, response extraction, usage
 * calculation, and error handling so each node only specifies its
 * model ID and pricing.
 */
export async function executeAnthropicModel(
  node: ExecutableNode,
  context: NodeContext,
  modelId: string,
  pricing: TokenPricing
): Promise<NodeExecution> {
  try {
    const { instructions, input } = context.inputs;

    if (!input) {
      return node.createErrorResult("Input is required");
    }

    const client = new Anthropic({
      apiKey: "gateway-managed",
      timeout: 60000,
      ...getAnthropicConfig(context.env),
    });

    const response = await client.messages.create({
      model: modelId,
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
      pricing
    );

    return node.createSuccessResult({ text: responseText }, usage);
  } catch (error) {
    if (error instanceof APIError) {
      return node.createErrorResult(`Claude API error: ${error.message}`);
    }
    return node.createErrorResult(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
