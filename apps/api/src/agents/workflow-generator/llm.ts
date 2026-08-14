import type { ModelTier } from "./config";

/**
 * The one seam every model call in this module goes through.
 *
 * It lives here rather than beside the pipeline because the pipeline is only
 * one of its callers: the brief, the model router and both benchmark harnesses
 * speak the same two shapes, and pointing them at the pipeline to borrow a type
 * made the largest module in the package a dependency of everything that talks
 * to a model.
 */

/** One LLM round trip, provider-agnostic so tests can stub it. */
export interface GenerateCall {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Defaults to "synthesis", so every call site that predates tiers is unchanged. */
  tier?: ModelTier;
  /** Response schema for this call. Defaults to the workflow draft schema. */
  schema?: Record<string, unknown>;
}

export interface GenerateResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

/** Tokens spent per tier, since the tiers are priced an order of magnitude apart. */
export type TierUsage = Record<
  ModelTier,
  { inputTokens: number; outputTokens: number }
>;

export function emptyTierUsage(): TierUsage {
  return {
    fast: { inputTokens: 0, outputTokens: 0 },
    synthesis: { inputTokens: 0, outputTokens: 0 },
  };
}
