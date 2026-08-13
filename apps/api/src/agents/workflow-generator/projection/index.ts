import type {
  BriefDestination,
  NodeType,
  WorkflowTrigger,
} from "@dafthunk/types";
import type { Ineligible } from "../eligibility";
import type { GroundingContext } from "../grounding";
import { BRIEF_SCHEMA, buildBriefSystemPrompt } from "./brief-turn";
import {
  buildSystemPrompt,
  DRAFT_SCHEMA,
  EARLY_PLAN_SCHEMA,
  EARLY_PLAN_SYSTEM,
} from "./synthesis-turn";

/**
 * How the platform explains itself to a model.
 *
 * Everything under this directory writes for one reader: the LLM. That reader
 * cannot read our source, cannot be deprecated, and never files a bug report —
 * which makes this an unversioned public API with no compiler on the other end.
 * A sentence here that describes the platform as it was a year ago goes on
 * being sent, forever, and the only symptom is a generation slightly worse than
 * it should be.
 *
 * ## The rule
 *
 * **Single statement.** Every platform fact is stated exactly once, where it is
 * owned. Prose is a legitimate form of statement — `COMPONENT_FAMILIES[*].purpose`
 * and `DESTINATION_SPECS[*].label` are hand-written English declared as data,
 * and that is correct.
 *
 * **Render, never restate.** A string in this directory containing a node type,
 * family key, trigger id, parameter type or field type that is not an
 * interpolation is a bug. `prompts.test.ts` and `prompt-facts.test.ts` enforce
 * it against the rendered output rather than the source, so a fact hardcoded in
 * a helper three files away is still caught.
 *
 * **Teach by evaluating the predicate, not paraphrasing it.** The load-bearing
 * type rules are negatives — "json is NOT a wildcard" — and no paraphrase of
 * `areTypesCompatible` stays true. `describeTypeRules` runs
 * `explainIncompatibility` on chosen pairs instead: the pairs are pedagogy,
 * every word of the explanation comes from the code that will reject the edge.
 * That is also why the prompt and the repair message now use identical wording.
 *
 * ## What is not here
 *
 * A renderer belongs in this layer when its reader cannot ask a follow-up
 * question. A person can click through, ignore it, or ask support; a model gets
 * one shot and no recourse. So `describeMissingResource`, `providerLabel`,
 * `previewExecution` and `trace.summarize` stay outside — they are written for
 * someone who can react.
 *
 * Also outside, deliberately: `ai-nodes.ts` produces `NodeType[]` that feed
 * *scoring* as well as the prompt, and builds real graph nodes; `selectExamples`
 * ranks rather than renders; `enrich-validation` decides what is wrong, and only
 * its formatter is projection.
 *
 * There is no `facts.ts` tier. One was designed, on the reasoning that a shared
 * fact layer would stop renderers holding a family's noun when they needed its
 * key. That defect is now fixed at the source — `renderFamily` leads with the
 * key, and every list is derived where it is owned — so a `PlatformFacts`
 * intermediate would re-wrap `GroundingContext`, `AI_CAPABILITIES` and
 * `TRIGGER_TO_NODE_TYPES` without adding a constraint the guard tests do not
 * already enforce. It was a means to derivation, and derivation arrived by a
 * shorter road.
 */

/**
 * One model call's worth of instruction: the prose and the schema together.
 *
 * They travel as one value because they are one artifact. `DRAFT_SCHEMA` drifted
 * from `TRIGGER_TO_NODE_TYPES` precisely because a schema exported on its own is
 * not something anyone thinks of as prompt text — and `model-router` defaulted
 * to it whenever a caller forgot one, which is how a brief call could have been
 * constrained by the workflow schema.
 */
export interface Briefing {
  readonly system: string;
  readonly schema: Record<string, unknown>;
}

export interface BriefBriefingInput {
  destinations: BriefDestination[];
  triggers: WorkflowTrigger[];
  connectedProviders: ReadonlySet<string>;
  grounding?: GroundingContext;
}

/** Turn one: read the request back as a sentence with its guesses visible. */
export function briefBriefing(input: BriefBriefingInput): Briefing {
  return {
    system: buildBriefSystemPrompt(input),
    schema: BRIEF_SCHEMA as unknown as Record<string, unknown>,
  };
}

export interface SynthesisBriefingInput {
  /** What the model may see. */
  catalog: NodeType[];
  /** The full registry, for describing the nodes the server injects. */
  nodeTypes: NodeType[];
  withheld: Ineligible[];
  unconnectedProviders?: string[];
  query: string;
  grounding?: GroundingContext;
  destination?: BriefDestination;
  /** Already-rendered catalog section, when the caller measured it. */
  renderedCatalog?: string;
}

/**
 * Turn two: compose the graph.
 *
 * `system` is built on first read and then remembered. A resumed turn replays
 * the stored prompt of the turn it continues and never touches this — and
 * building it eagerly meant every critique assembled forty thousand characters
 * (the catalog, the grounding section, two worked examples, the template
 * ranking behind them) purely to discard it one line later. The schema still
 * travels with the prose, which is the point of the pairing; only the cost of
 * the prose is deferred.
 */
export function synthesisBriefing(input: SynthesisBriefingInput): Briefing {
  let system: string | undefined;
  return {
    get system() {
      system ??= buildSystemPrompt(input);
      return system;
    },
    schema: DRAFT_SCHEMA as unknown as Record<string, unknown>,
  };
}

/**
 * The fast-tier preview shown while synthesis is still writing.
 *
 * Names no platform fact, so it is a constant — the one turn whose instruction
 * does not depend on what this deployment can build.
 */
export function earlyPlanBriefing(): Briefing {
  return {
    system: EARLY_PLAN_SYSTEM,
    schema: EARLY_PLAN_SCHEMA as unknown as Record<string, unknown>,
  };
}

export {
  buildCritiquePrompt,
  buildEarlyPlanPrompt,
  buildRepairPrompt,
  buildRunRepairPrompt,
  buildUserPrompt,
  renderCatalog,
} from "./synthesis-turn";
