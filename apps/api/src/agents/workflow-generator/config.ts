import type { AgentProvider } from "@dafthunk/runtime/nodes/agent/base-agent-node";
import type { TokenPricing } from "@dafthunk/runtime/utils/usage";

/**
 * Every knob for workflow generation, in one place.
 *
 * The model is deliberately a single constant: the 23-template benchmark
 * (`benchmark.integration.ts`) is what decides which tier we can afford, and
 * swapping tiers should be a one-line change plus a benchmark run.
 */
export const GENERATOR_PROVIDER: AgentProvider = "anthropic";
export const GENERATOR_MODEL = "claude-opus-5";

export const GENERATOR_PRICING: TokenPricing = {
  inputCostPerMillion: 15.0,
  outputCostPerMillion: 75.0,
};

/** Repair rounds after the initial attempt, so 3 LLM calls worst case. */
export const MAX_REPAIR_ATTEMPTS = 2;

/** Upper bound on node types shown to the model, before the core kit is unioned in. */
export const MAX_CANDIDATE_NODE_TYPES = 60;

/**
 * A run whose `updated_at` is older than this is presumed dead. A half-finished
 * LLM call cannot be resumed, so the session fails loudly rather than hanging.
 */
export const RUN_STALL_TIMEOUT_MS = 180_000;

/** How long a finished session keeps its frame log for reconnects. */
export const RUN_RETENTION_MS = 60 * 60 * 1000;

/** Generation cap per organization, enforced in `rate-limit.ts`. */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX_PER_WINDOW = 10;
