/**
 * Workflow generation: a request in, a saved and rehearsed workflow out.
 *
 * Two turns. `generateBrief` reads a request back as a sentence with its
 * guesses left visible and stops for the person; `runGenerationPipeline` takes
 * what they agreed to and builds, validates, repairs, saves and rehearses the
 * graph. Both are held to one `Workspace` — the picture of what this
 * organization can actually build right now — which is what stops the sentence
 * promising something the graph would have to walk back.
 *
 * A caller needs three things: a `Workspace`, a way to reach a model, and
 * somewhere to put the result. Everything else named here is a type it has to
 * store or report on.
 *
 * Everything NOT named here is internal: candidate selection, eligibility,
 * hydration, validation enrichment, prompt assembly, resource resolution,
 * destination catalogs. Those are the parts most likely to change shape, and no
 * caller outside this directory has needed to name one. Reach past this file
 * only from tests and the eval harnesses under `eval/`.
 *
 * The export list is sorted by module path, because the formatter sorts it.
 */

/**
 * Projects an existing workflow back into the model's dialect, so a session
 * that adopted one can be critiqued as though it had generated it.
 */
export { workflowToDraft } from "./adopt";
export type { BriefDependencies, BriefOutcome, BriefRole } from "./brief";
export { briefSuggestions, generateBrief } from "./brief";
/** Policy knobs the host enforces: pricing, retention, stall and rate limits. */
export {
  GENERATOR_MODELS,
  generationRateLimit,
  RUN_RETENTION_MS,
  RUN_STALL_TIMEOUT_MS,
} from "./config";
export type { GroundingContext } from "./grounding";
/**
 * Trigger bindings blanked at save time, so a generated schedule or mailbox
 * lands inert. The caller stores them; a later `arm` turn writes them back.
 */
export type { DisarmedInput } from "./hydrate";
/** The one seam every model call goes through. */
export type { GenerateCall, GenerateResult, TierUsage } from "./llm";
export { emptyTierUsage } from "./llm";
export type { ModelOverride, ModelOverrides } from "./model-router";
export {
  createModelRouter,
  parseModelOverride,
  resolveTier,
} from "./model-router";
export type { OrgResources } from "./org-resources";
export type { PipelineDependencies, PipelineResult } from "./pipeline";
export { runGenerationPipeline } from "./pipeline";
/** Replays the prompt an adopted workflow's fabricated conversation needs. */
export { buildUserPrompt } from "./projection/synthesis-turn";
export type { RateLimitVerdict } from "./rate-limit";
export { checkGenerationRateLimit } from "./rate-limit";
export type { CreateResourceFn } from "./resource-resolver";
/** What every stage did, in order — present even when the generation failed. */
export type { TraceEntry } from "./trace";
export { firstFailure, summarize } from "./trace";
/**
 * What can be built here. `loadWorkspace` reads it out of D1, the registry and
 * the model catalog; `createWorkspace` builds one from facts already in hand,
 * which is what the tests and eval harnesses use.
 */
export type { Workspace, WorkspaceFacts } from "./workspace";
export { createWorkspace, loadWorkspace } from "./workspace";
