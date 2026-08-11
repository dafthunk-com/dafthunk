import type { AgentProvider } from "@dafthunk/runtime/nodes/agent/base-agent-node";
import type { TokenPricing } from "@dafthunk/runtime/utils/usage";

/**
 * Every knob for workflow generation, in one place.
 *
 * Two tiers, because the two jobs are not alike. Reading a request back as a
 * sentence is a short, schema-shaped call that a person is waiting on — it has
 * to land in a couple of seconds or the screen reads as a stall. Composing a
 * graph out of sixty node types is the expensive one, and it happens behind a
 * progress indicator where a few more seconds cost nothing.
 *
 * Each tier carries its own provider, so switching one is a one-line change
 * plus a benchmark run. That matters more than it looks: the Anthropic path
 * appends the JSON schema to the system prompt, while the Google path
 * constrains decoding — and the brief's failure modes are all schema-shaped.
 */
export type ModelTier = "fast" | "synthesis";

export interface ModelTierConfig {
  provider: AgentProvider;
  model: string;
  pricing: TokenPricing;
}

export const GENERATOR_MODELS: Record<ModelTier, ModelTierConfig> = {
  fast: {
    provider: "anthropic",
    model: "claude-sonnet-5",
    pricing: {
      inputCostPerMillion: 3.0,
      outputCostPerMillion: 15.0,
    },
  },
  /**
   * Deliberately the same model as `fast` while the feature is in development.
   *
   * The tier split is about job shape, not about this model choice, so it stays
   * — flipping this back to a larger model is a one-line change plus a
   * benchmark run. Opus was costing more than it was worth here in two ways:
   * it prices an order of magnitude higher, and its capacity is visibly
   * tighter, which surfaces to the user as a failed generation rather than a
   * slower one.
   */
  synthesis: {
    provider: "anthropic",
    model: "claude-sonnet-5",
    pricing: {
      inputCostPerMillion: 3.0,
      outputCostPerMillion: 15.0,
    },
  },
};

/**
 * Output budget per tier.
 *
 * A workflow draft is a whole graph plus its test examples — nodes, edges and
 * literal values — and the default 4096 is roughly five thousand characters of
 * pretty-printed JSON. Drafts run past that routinely, and the failure is ugly:
 * the model stops mid-array and the caller gets a document that looks complete
 * enough to parse. A brief is one sentence and needs nothing like as much.
 */
export const GENERATOR_MAX_TOKENS: Record<ModelTier, number> = {
  fast: 2048,
  synthesis: 16384,
};

/**
 * Tries the brief turn gets per fault kind before giving up on that kind.
 *
 * Two, not one, because the forced-tool response occasionally arrives mangled
 * — and one cheap retry on the fast tier is far less costly than telling a
 * person their clear request was too vague. Not more than two: past that the
 * fault is not transient and the wait stops being worth it.
 *
 * Per kind, because an off-schema answer and a brief missing its guaranteed
 * slots are unrelated transients: a run that hits both in sequence deserves a
 * repair for each, and sharing one budget meant the second went unrepaired.
 * Worst case is three fast-tier calls.
 */
export const BRIEF_ATTEMPTS = 2;

/**
 * How close to the best match a withheld node must score before we tell the
 * user about it.
 *
 * A share of the top score rather than a rank, because the catalogue is 450
 * types in production and a dozen in a test — a rank cut means opposite things
 * at those two sizes. "Scored at all" is far too loose: "post a slack message"
 * shares the token "post" with every blogging node, and announcing WordPress
 * there is the same noise this exists to remove.
 */
export const WITHHELD_RELEVANCE_RATIO = 0.5;

/** Repair rounds after the initial attempt, so 3 LLM calls worst case. */
export const MAX_REPAIR_ATTEMPTS = 2;

/**
 * Repair rounds for a graph that validated but failed when it ran. Each one
 * costs an LLM call and a second execution, so the worst case for a generation
 * is 4 calls and 2 runs.
 */
export const MAX_RUN_REPAIR_ATTEMPTS = 1;

/**
 * Gaps put to the user before the first run.
 *
 * Two, because elicitation competes with the thing it is for. Every question
 * is a chance to leave, and the remaining ambiguity has a cheaper resolution
 * than asking: show a result and let them react to it. People cannot enumerate
 * what they left out, but they can correct something concrete.
 */
export const MAX_ASKED_BLANKS = 2;

/**
 * Tappable spans a sentence may carry in total — asked and quiet together.
 *
 * Extends `MAX_ASKED_BLANKS` rather than contradicting it: the budget above
 * limits *questions*, because elicitation competes with the thing it is for.
 * A quiet slot is not elicitation — it is an affordance the user can ignore —
 * so a correctly identified moving part no longer has to be destroyed to
 * protect the question budget. But every span is still a thing the eye
 * snags on, and a sentence that is all slots is as illegible as one with
 * none, so the total is capped too. Beyond it, the old behavior returns:
 * the lowest-weight blanks collapse into the words they would have read as.
 * Guaranteed roles (destination, trigger) are exempt from the cap.
 */
export const MAX_TOTAL_BLANKS = 6;

/**
 * Below this many words a request cannot carry a sentence, so the brief turn
 * offers three complete ones to pick from instead of interrogating a person
 * who has given us nothing to work with.
 */
export const MIN_REQUEST_WORDS = 4;

/** Suggestions offered when the request is too thin to read back. */
export const BRIEF_SUGGESTION_COUNT = 3;

/** Test inputs kept per generated workflow. */
export const MAX_GENERATED_EXAMPLES = 3;

/**
 * Size ceiling for one example value. Examples are test data meant to be read
 * and edited in the UI, so a model that pastes a whole article into one is
 * truncated rather than stored.
 */
export const MAX_EXAMPLE_VALUE_CHARS = 2000;

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

/**
 * The same cap locally, where the constraint is a person's patience rather
 * than spend.
 *
 * A slot is spent per socket, not per generation, so a reload mid-run and an
 * OAuth round trip each cost one — a testing pass exhausts ten long before it
 * has generated ten workflows.
 */
export const RATE_LIMIT_MAX_PER_WINDOW_DEV = 200;

/** The cap in force for a deployment. */
export function generationRateLimit(cloudflareEnv: string): number {
  return cloudflareEnv === "development"
    ? RATE_LIMIT_MAX_PER_WINDOW_DEV
    : RATE_LIMIT_MAX_PER_WINDOW;
}
