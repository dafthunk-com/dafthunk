/**
 * Usage calculation utilities for billing based on API pricing.
 * 1000 credits = $1
 */

export interface TokenPricing {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

/**
 * Estimate token count from text length.
 * Uses ~4 characters per token as a rough approximation.
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate usage credits from token counts or text.
 * @param input - Number of input tokens, or input text to estimate tokens from
 * @param output - Number of output tokens, or output text to estimate tokens from
 * @param pricing - Cost per million tokens for input and output
 * @returns Usage credits (minimum 1)
 */
export function calculateTokenUsage(
  input: number | string,
  output: number | string,
  pricing: TokenPricing
): number {
  const inputTokens =
    typeof input === "string" ? estimateTokenCount(input) : input;
  const outputTokens =
    typeof output === "string" ? estimateTokenCount(output) : output;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPerMillion;
  const totalCost = inputCost + outputCost;

  // Convert to credits (1000 credits = $1), minimum 1 credit
  return Math.max(1, Math.round(totalCost * 1000));
}

// Cloudflare Browser Rendering pricing: $0.09/hour
// https://developers.cloudflare.com/browser-rendering/pricing/
const BROWSER_COST_PER_MS = 0.09 / 3600 / 1000; // $0.000000025 per millisecond

/**
 * Calculate usage credits for browser rendering operations.
 * @param durationMs - Actual duration in milliseconds
 * @returns Usage credits (minimum 10)
 */
export function calculateBrowserUsage(durationMs: number): number {
  const cost = durationMs * BROWSER_COST_PER_MS;
  // Convert to credits (1000 credits = $1), minimum 10 credits
  return Math.max(10, Math.round(cost * 1000));
}
