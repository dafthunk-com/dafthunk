import type { InputOverrides } from "@dafthunk/runtime";
import type {
  BriefDestination,
  CloudflareModelInfo,
  Edge,
  GenerationValidationIssue,
  GeneratorServerMessage,
  NodeType,
  OutwardAction,
  Workflow,
  WorkflowExample,
  WorkflowExecution,
} from "@dafthunk/types";
import type { ResolvedResourceBinding } from "@dafthunk/utils";
import type { WorkflowExecutorParameters } from "../../services/workflow-executor";
import {
  buildInputOverrides,
  buildTriggerParameters,
} from "../../utils/example-inputs";
import { selectCandidates } from "./catalog-selection";
import type { ModelTier } from "./config";
import {
  MAX_APPROVAL_ROUNDS,
  MAX_REPAIR_ATTEMPTS,
  MAX_RUN_REPAIR_ATTEMPTS,
} from "./config";
import type {
  DraftExample,
  DraftNode,
  DraftResource,
  EnrichedValidationError,
  GeneratedWorkflowDraft,
} from "./draft-types";
import { withheldProviders, withheldResources } from "./eligibility";
import { enrichValidation, formatErrorsForLLM } from "./enrich-validation";
import { buildGeneratedExamples } from "./examples";
import { previewExecution } from "./execution-preview";
import type { GroundingContext } from "./grounding";
import type { BoundResource, DisarmedInput } from "./hydrate";
import { hydrateGeneratedWorkflow, normalizeTrigger } from "./hydrate";
import type { OrgResources, OrgResourceType } from "./org-resources";
import {
  boundResourceNote,
  describeMissingResource,
  offerableResources,
} from "./org-resources";
import { outwardActions } from "./outward-actions";
import { parseJsonObject } from "./parse-json";
import {
  buildCritiquePrompt,
  buildDeclinePrompt,
  buildEarlyPlanPrompt,
  buildRepairPrompt,
  buildRunRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  EARLY_PLAN_SCHEMA,
  EARLY_PLAN_SYSTEM,
} from "./prompts";
import type { CreateResourceFn } from "./resource-resolver";
import { createResourceResolver } from "./resource-resolver";
import type { DraftKind, TraceEntry } from "./trace";

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

export interface PipelineDependencies {
  prompt: string;
  /** Live registry types; never a hardcoded snapshot. */
  nodeTypes: NodeType[];
  connectedProviders: ReadonlySet<string>;
  /** What the org owns, for node inputs holding a resource id. */
  orgResources?: OrgResources;
  /** The same facts assembled for prompts: entity purposes + instances. */
  grounding?: GroundingContext;
  /** Live Workers AI catalog, best-effort; static descriptions without it. */
  modelCatalog?: CloudflareModelInfo[];
  /**
   * What the brief's grounded blanks resolved to — which instances to reuse,
   * which to create — re-validated by the caller against the org's current
   * resources. Pre-seeds the resource resolver, and wins over the draft.
   */
  resourceBindings?: ResolvedResourceBinding[];
  /**
   * Brings a missing component into being. Absent — tests, the developer
   * path — nothing is ever created and "create" degrades to reuse-or-unset.
   */
  createResource?: CreateResourceFn;
  /** Address that `send-email` delivers to; the model never sees it. */
  ownerEmail?: string;
  /**
   * Where the result has to end up, when a brief established it. Absent for a
   * bare prompt, in which case delivery is unconstrained as before.
   */
  destination?: BriefDestination;
  apiHost?: string;
  callLLM: (call: GenerateCall) => Promise<GenerateResult>;
  emit: (frame: GeneratorServerMessage) => void;
  /**
   * Persists the graph and its test inputs. Passing `workflowId` updates that
   * workflow instead of creating one, which is what a repaired run re-saves
   * through — a second workflow would leave the user with the broken one too.
   */
  save: (
    workflow: Workflow,
    examples: WorkflowExample[],
    workflowId?: string
  ) => Promise<string>;
  run: (
    workflow: Workflow,
    workflowId: string,
    parameters: WorkflowExecutorParameters,
    inputOverrides?: InputOverrides
  ) => Promise<WorkflowExecution>;
  isCancelled?: () => boolean;
  /**
   * Asks before doing anything that leaves the platform.
   *
   * The trial run is a real execution, so a graph ending in "post it" posts.
   * Absent, the run proceeds unasked — which is right for the developer path
   * and for tests, and wrong for anyone else, so the DO always supplies it.
   */
  requestApproval?: (
    actions: OutwardAction[]
  ) => Promise<{ approved: boolean; reason?: string }>;
  /**
   * Continue an earlier generation instead of starting one.
   *
   * The user has seen a result and said what is wrong with it. Selection and
   * the first draft are skipped entirely: the conversation that produced the
   * workflow is replayed, the note appended, and the existing repair/save/run
   * loop does the rest — against the same `workflowId`, so they end up with a
   * corrected workflow rather than a second one beside the wrong one.
   */
  resume?: {
    /**
     * The system prompt of the turn being resumed, replayed verbatim.
     * Absent for an adopted workflow's first critique — there is no stored
     * turn, so the pipeline composes a fresh prompt from `prompt` exactly as
     * it would for a generation. That keeps prompt assembly in one place and
     * keeps the advertised catalog and the hydration catalog the same set.
     */
    system?: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    note: string;
    workflowId: string;
  };
  /** Hands back the conversation so a later critique can pick it up. */
  onConversation?: (
    system: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>
  ) => void;
  /**
   * Emit a fast-tier preview of the plan while synthesis is still writing.
   *
   * Off by default so tests and harnesses see exactly the calls they stub.
   * The DO turns it on: a first-run user stares at the synthesis wait for the
   * better part of a minute, and the real plan cannot arrive sooner because
   * the model call is not streamed.
   */
  earlyPlan?: boolean;
}

export interface PipelineResult {
  outcome: "ok" | "partial" | "failed";
  workflowId?: string;
  executionId?: string;
  workflow?: Workflow;
  /**
   * Components brought into being for this workflow. Kept even on a failed
   * outcome: once a row exists it exists, and reporting it is what makes it
   * deletable rather than orphaned.
   */
  createdResources: BoundResource[];
  /**
   * The trigger bindings blanked before the save, matching `workflow`. The
   * caller stores them so a later `arm` turn can write them back — without
   * this, "turn it on" would have nothing to restore: hydration deleted the
   * schedule the user asked for, on purpose, and this is the only copy.
   */
  disarmed?: DisarmedInput[];
  /** Totals across every tier, kept because most callers only want the sum. */
  inputTokens: number;
  outputTokens: number;
  /** The same tokens split by tier, which is what prices correctly. */
  usage: TierUsage;
  /**
   * What every stage did, in order.
   *
   * Present on every outcome including `failed` — a generation that produced
   * nothing is exactly the one whose stages are worth reading. See `trace.ts`.
   */
  trace: TraceEntry[];
}

class Cancelled extends Error {}

/**
 * Whether anything blocks the graph from being saved.
 *
 * The pipeline's central predicate — it decides whether to repair, whether to
 * save, and whether a rework may replace what is already stored. Named because
 * `warning` findings are shown to the user and never gate anything, and an
 * inlined `.some(...)` at five call sites is five chances to forget that.
 */
function hasFatal(errors: EnrichedValidationError[]): boolean {
  return errors.some((error) => error.severity === "fatal");
}

function fatalCount(errors: EnrichedValidationError[]): number {
  return errors.filter((error) => error.severity === "fatal").length;
}

function toIssues(
  errors: EnrichedValidationError[]
): GenerationValidationIssue[] {
  return errors.map((error) => ({
    code: error.code,
    severity: error.severity,
    message: error.message,
    nodeId: error.nodeId,
    edge: error.edge,
  }));
}

/** Nodes that errored in a run. The number a repair has to bring down. */
export function failedNodeCount(execution: WorkflowExecution): number {
  return execution.nodeExecutions.filter((node) => node.status === "error")
    .length;
}

/**
 * Whether a repaired run is actually an improvement on the one before it.
 *
 * A repair that validates can still be worse than what it replaced — the
 * observed shape is a model that answers "this node is missing an input" by
 * adding more nodes around it, leaving the original failure in place and
 * bringing new ones with it. Without this the loop reads as progress while it
 * accumulates damage, and every extra round costs a synthesis call.
 *
 * Completing beats not completing; past that, fewer broken nodes wins. Equal is
 * not an improvement: it means the round achieved nothing.
 */
export function isRunImprovement(
  next: WorkflowExecution,
  previous: WorkflowExecution
): boolean {
  if (next.status === "completed") return previous.status !== "completed";
  if (previous.status === "completed") return false;
  return failedNodeCount(next) < failedNodeCount(previous);
}

/**
 * Renders a failed run as instructions for the model.
 *
 * Node type is included because the model named the type but never saw the
 * node's real ports, so "javascript threw" and "ai-text threw" call for
 * completely different fixes. Messages are truncated: a stack trace from a
 * sandboxed node can run to kilobytes and the first line carries the signal.
 */
export function formatRunFailures(
  execution: WorkflowExecution,
  workflow: Workflow
): string {
  const typeById = new Map(workflow.nodes.map((node) => [node.id, node.type]));

  const failures = execution.nodeExecutions
    .filter((node) => node.status === "error")
    .map((node, index) => {
      const type = typeById.get(node.nodeId);
      const where = type
        ? `node "${node.nodeId}" (type ${type})`
        : `node "${node.nodeId}"`;
      const message = (node.error ?? "failed with no message").slice(0, 500);
      return `${index + 1}. ${where}: ${message}`;
    });

  if (failures.length) return failures.join("\n");

  // A run can fail before any node reports — a credit ceiling, or the 30s
  // worker timeout. There is nothing node-specific to say, so say that.
  return `The run ended with status "${execution.status}"${
    execution.error
      ? `: ${execution.error.slice(0, 500)}`
      : " and no node error."
  }`;
}

/**
 * Extracts the draft object from a model response.
 *
 * The Anthropic path appends the schema to the system prompt rather than
 * constraining decoding, so a stray fence or preamble is always possible.
 */
export function parseDraft(content: string): GeneratedWorkflowDraft {
  const parsed = parseJsonObject(content);

  // Element shapes are checked downstream — `hydrateGeneratedWorkflow` against
  // the registry, `buildGeneratedExamples` against the graph. Here a field only
  // has to be the right kind of container.
  const array = <T>(value: unknown): T[] =>
    Array.isArray(value) ? (value as T[]) : [];

  return {
    title: String(parsed.title ?? "Generated Workflow"),
    description: String(parsed.description ?? ""),
    trigger: parsed.trigger as GeneratedWorkflowDraft["trigger"],
    steps: array<unknown>(parsed.steps).map(String),
    nodes: array<DraftNode>(parsed.nodes),
    edges: array<Edge>(parsed.edges),
    examples: Array.isArray(parsed.examples)
      ? array<DraftExample>(parsed.examples)
      : undefined,
    resources: Array.isArray(parsed.resources)
      ? array<DraftResource>(parsed.resources)
      : undefined,
    sampleTrigger:
      parsed.sampleTrigger && typeof parsed.sampleTrigger === "object"
        ? (parsed.sampleTrigger as Record<string, unknown>)
        : undefined,
  };
}

/**
 * Generate → validate → repair → save → run.
 *
 * Every dependency that touches the network is injected, so the whole flow runs
 * deterministically in unit tests. The Durable Object is a thin shell over this.
 */
export async function runGenerationPipeline(
  deps: PipelineDependencies
): Promise<PipelineResult> {
  const usage = emptyTierUsage();

  /** Everything the pipeline itself calls is composition, so it is synthesis. */
  const record = (result: GenerateResult, tier: ModelTier = "synthesis") => {
    usage[tier].inputTokens += result.inputTokens;
    usage[tier].outputTokens += result.outputTokens;
  };

  /**
   * What each stage did. Rides along with `totals()` so that every exit — the
   * successful one, the unrepairable one, the cancelled one and the catch —
   * carries it without any of them having to remember to.
   */
  const trace: TraceEntry[] = [];
  const note = (entry: TraceEntry) => trace.push(entry);

  /**
   * Components created during this run, accumulated across every attempt.
   * Lives beside the token totals for the same reason: every exit — success,
   * unrepairable, cancelled, the catch — must report what now exists.
   */
  const createdResources: BoundResource[] = [];

  /** Totals, recomputed at every exit so no path can forget to sum. */
  const totals = () => ({
    inputTokens: usage.fast.inputTokens + usage.synthesis.inputTokens,
    outputTokens: usage.fast.outputTokens + usage.synthesis.outputTokens,
    usage,
    trace,
    createdResources,
  });

  const checkCancelled = () => {
    if (deps.isCancelled?.()) throw new Cancelled();
  };

  /**
   * Every validation pass runs against the same contract — including the
   * destination, so a repair round is never held to a weaker bar than the
   * first draft was.
   */
  const validate = (result: ReturnType<typeof hydrateGeneratedWorkflow>) =>
    enrichValidation(result.workflow, deps.nodeTypes, result.errors, {
      destination: deps.destination,
    });

  /**
   * What is already in the user's workspace.
   *
   * Hoisted out of the try so the catch below can still report it. Once a
   * workflow has been saved it exists whatever happens next, and a late failure
   * that reported it as absent would leave the user with a workflow they were
   * told had not been built — orphaned from the session that made it, and
   * indistinguishable from one they created by accident.
   */
  let workflowId: string | undefined;
  let savedWorkflow: Workflow | undefined;
  /** The blanked trigger bindings matching `savedWorkflow`, for `arm`. */
  let savedDisarmed: DisarmedInput[] = [];
  let execution: WorkflowExecution | undefined;

  try {
    // ── Select ────────────────────────────────────────────────────────────
    // Candidate types are needed either way: hydration resolves the model's
    // type names against them, including on a resumed turn.
    const { candidates, withheld } = selectCandidates(
      deps.prompt,
      deps.nodeTypes,
      deps.connectedProviders,
      deps.destination?.nodeTypes ?? [],
      deps.orgResources ? offerableResources(deps.orgResources) : new Set(),
      deps.modelCatalog
    );

    {
      const offeredTypes = candidates.map((candidate) => candidate.type);
      const offered = new Set(offeredTypes);
      const required = deps.destination?.nodeTypes ?? [];
      // A promised destination whose node never reached the catalog is the one
      // selection failure that dooms the generation outright: the prompt tells
      // the model to deliver with a type it cannot see the ports of, and
      // `DESTINATION_NOT_REALIZED` then spends the whole repair budget on it.
      const missingRequired = required.filter((type) => !offered.has(type));

      note({
        stage: "select",
        ok: missingRequired.length === 0,
        catalog: deps.nodeTypes.length,
        offeredTypes,
        required: [...required],
        missingRequired,
        withheldProviders: withheldProviders(withheld),
        withheldResources: withheldResources(withheld),
      });
    }

    if (!deps.resume) {
      deps.emit({
        type: "phase",
        phase: "selecting",
        label: "Choosing the pieces",
      });
      deps.emit({
        type: "log",
        level: "info",
        message: `Considering ${candidates.length} of ${deps.nodeTypes.length} node types.`,
      });

      for (const provider of withheldProviders(withheld)) {
        deps.emit({
          type: "log",
          level: "warn",
          message: `This looks like it wanted ${provider}, which is not connected in this workspace — so those steps are left out.`,
          link: "integrations",
          // Safe to put in front of the user now that `withheldProviders` only
          // returns providers the request actually scored against. It used to
          // return every provider in the catalogue, which buried the one that
          // mattered under five that did not.
          important: true,
        });
      }

      // Previously dropped on the floor: a request needing a database, a queue
      // or a bot simply lost those steps with nothing said about it.
      for (const resource of withheldResources(withheld)) {
        const type = resource as OrgResourceType;
        deps.emit({
          type: "log",
          level: "warn",
          message: describeMissingResource(
            type,
            deps.orgResources?.[type]?.length ?? 0
          ),
          important: true,
        });
      }
    }

    checkCancelled();

    /**
     * Draft → real graph, under one set of rules for every attempt.
     *
     * The recipient is supplied only when the workflow is meant to mail the
     * person who asked. Any other use of `send-email` addresses someone else,
     * and defaulting there would be a silently wrong recipient rather than a
     * missing one the repair loop would catch.
     *
     * The resolver is constructed once and consulted per attempt: repair
     * rounds re-emit the draft, and its creation cache is what keeps a
     * re-emitted "create" from multiplying rows. Creation runs before the
     * (synchronous) hydration, which then binds whatever now exists.
     */
    const resolver = createResourceResolver(deps.orgResources ?? {}, {
      create: deps.createResource,
      briefBindings: deps.resourceBindings,
    });

    const hydrate = async (input: GeneratedWorkflowDraft) => {
      const resolution = await resolver.resolve(input.resources);
      for (const created of resolution.created) {
        createdResources.push({
          type: created.type,
          name: created.resource.name,
        });
      }
      for (const message of resolution.notes) {
        deps.emit({ type: "log", level: "info", message, important: true });
      }
      return hydrateGeneratedWorkflow(input, deps.nodeTypes, candidates, {
        ownerEmail:
          deps.destination?.kind === "email" ? deps.ownerEmail : undefined,
        orgResources: deps.orgResources,
        bindings: resolution.bindings,
      });
    };

    // ── Generate ──────────────────────────────────────────────────────────
    if (!deps.resume) {
      deps.emit({
        type: "phase",
        phase: "planning",
        label: "Planning the steps",
      });
    }

    const system =
      deps.resume?.system ??
      buildSystemPrompt({
        catalog: candidates,
        nodeTypes: deps.nodeTypes,
        withheld,
        query: deps.prompt,
        destination: deps.destination,
        grounding: deps.grounding,
      });

    // A resumed turn replays the conversation that produced the workflow and
    // appends the note, so the model corrects what it built rather than
    // starting over from a description of it.
    const messages: Array<{ role: "user" | "assistant"; content: string }> =
      deps.resume
        ? [
            ...deps.resume.messages,
            { role: "user", content: buildCritiquePrompt(deps.resume.note) },
          ]
        : [{ role: "user", content: buildUserPrompt(deps.prompt) }];

    deps.emit(
      deps.resume
        ? { type: "phase", phase: "repairing", label: "Making that change" }
        : { type: "phase", phase: "generating", label: "Wiring it up" }
    );

    // A first look at the plan, seconds in. Fired in parallel with synthesis
    // and best-effort by construction: a failure, an empty answer or a lost
    // race changes nothing, and the synthesis plan frame — same type, whole
    // list — overwrites it the moment the real draft returns.
    let synthesisReturned = false;
    if (deps.earlyPlan && !deps.resume) {
      void deps
        .callLLM({
          tier: "fast",
          system: EARLY_PLAN_SYSTEM,
          messages: [
            { role: "user", content: buildEarlyPlanPrompt(deps.prompt) },
          ],
          schema: EARLY_PLAN_SCHEMA as unknown as Record<string, unknown>,
        })
        .then((result) => {
          record(result, "fast");
          if (synthesisReturned) return;
          const parsed = parseJsonObject(result.content);
          const steps = Array.isArray(parsed.steps)
            ? parsed.steps.map(String).filter(Boolean).slice(0, 8)
            : [];
          if (steps.length === 0) return;
          deps.emit({
            type: "plan",
            plan: {
              title: "",
              description: "",
              trigger: "manual",
              steps,
            },
          });
        })
        .catch(() => {
          // The preview is a courtesy; the build neither waits nor cares.
        });
    }

    let response = await deps.callLLM({ system, messages });
    synthesisReturned = true;
    record(response);

    let draft = parseDraft(response.content);
    deps.emit({
      type: "plan",
      plan: {
        title: draft.title,
        description: draft.description,
        trigger: normalizeTrigger(String(draft.trigger)) ?? "manual",
        steps: draft.steps,
      },
    });

    // ── Validate and repair ───────────────────────────────────────────────
    // `attempt` keys the UI's attempt list and only ever climbs; `repairs` is
    // the budget, shared with the run-repair round below so a generation costs
    // at most 1 + MAX_REPAIR_ATTEMPTS + MAX_RUN_REPAIR_ATTEMPTS calls.
    let attempt = 0;
    let repairs = 0;

    /** What the model named, before anything checks whether it exists. */
    const noteDraft = (kind: DraftKind) =>
      note({
        stage: "draft",
        ok: true,
        attempt,
        kind,
        outputTokens: response.outputTokens,
        types: draft.nodes.map((node) => node.type),
      });

    let hydrated = await hydrate(draft);
    let errors = validate(hydrated);

    /**
     * Records what hydration and validation just made of the current draft.
     *
     * Recording only — the two callers do their own assignment, because a
     * closure that reassigned them would have to be the only thing that ever
     * did, and the first draft is built before the repair machinery exists.
     * Shared so the trace cannot end up describing one path and not the other,
     * which is the failure the trace exists to catch elsewhere.
     */
    const noteGraph = () => {
      // A draft node whose id is absent from the built graph was dropped: its
      // type does not exist. Read off the graph rather than off the error list,
      // so it stays true whatever hydration decides to report.
      const built = new Set(hydrated.workflow.nodes.map((node) => node.id));
      const droppedTypes = draft.nodes
        .filter((node) => !built.has(node.id))
        .map((node) => node.type);

      note({
        stage: "hydrate",
        ok: droppedTypes.length === 0,
        attempt,
        drafted: draft.nodes.length,
        types: hydrated.workflow.nodes.map((node) => node.type),
        droppedTypes,
        boundResources: hydrated.boundResources.map((bound) => bound.type),
        rejectedTools: hydrated.errors
          .filter((error) => error.code === "UNKNOWN_TOOL")
          .map((error) => error.nodeId ?? "?"),
      });

      note({
        stage: "validate",
        ok: !hasFatal(errors),
        attempt,
        fatal: errors
          .filter((error) => error.severity === "fatal")
          .map((error) => error.code),
        warnings: errors
          .filter((error) => error.severity === "warning")
          .map((error) => error.code),
      });
    };

    noteDraft("initial");
    noteGraph();

    // Said once, on the first graph. A binding the user did not choose has to
    // be visible, or a workflow quietly reads from the wrong database. A
    // binding to something created moments ago already has its "Created …"
    // line; repeating it as "Used your …" would read as two resources.
    const createdNames = new Set(
      createdResources.map((entry) => `${entry.type}:${entry.name}`)
    );
    for (const bound of hydrated.boundResources) {
      if (createdNames.has(`${bound.type}:${bound.name}`)) continue;
      deps.emit({
        type: "log",
        level: "info",
        message: boundResourceNote(bound.type, { id: "", name: bound.name }),
        important: true,
      });
    }

    deps.emit({ type: "graph", workflow: hydrated.workflow, attempt });
    deps.emit({
      type: "phase",
      phase: "validating",
      label: "Checking it holds together",
    });
    deps.emit({ type: "validation", attempt, issues: toIssues(errors) });

    /**
     * One revision round: ask, parse, hydrate, validate, show.
     *
     * The single place the conversation advances. Every caller — validation
     * repair, refusal rework, run repair — needs the same five things to stay
     * true together (the conversation stays paired, the tokens are booked, all
     * three of draft/hydrated/errors move at once, and the user sees both
     * frames). Three hand-written copies of that is three chances for one of
     * them to drift.
     *
     * Returns false when the round produced nothing usable rather than
     * throwing. A repair that comes back truncated or fenced is a round that
     * failed, not a generation that failed: the draft already in hand is still
     * the best thing available, and by the run-repair stage there is a saved,
     * executed workflow riding on it.
     */
    const revise = async (
      kind: DraftKind,
      instruction: string
    ): Promise<boolean> => {
      attempt++;

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: instruction });

      response = await deps.callLLM({ system, messages });
      record(response);

      let revised: GeneratedWorkflowDraft;
      try {
        revised = parseDraft(response.content);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        // Logged rather than surfaced: the caller decides what an unusable
        // round means, and it is never the same thing twice — before the save
        // it exhausts the budget, after it the previous version simply stands.
        console.warn(
          `[WorkflowGenerator] discarding an unreadable revision: ${reason}`
        );
        note({
          stage: "draft",
          ok: false,
          attempt,
          kind,
          reason,
          outputTokens: response.outputTokens,
          types: [],
        });
        return false;
      }

      draft = revised;
      hydrated = await hydrate(draft);
      errors = validate(hydrated);

      noteDraft(kind);
      noteGraph();

      deps.emit({ type: "graph", workflow: hydrated.workflow, attempt });
      deps.emit({ type: "validation", attempt, issues: toIssues(errors) });
      return true;
    };

    /**
     * Repairs until the graph validates or the budget runs out. Called again
     * after a failed run, so a correction is held to the same bar as the
     * original: nothing is saved that would not have been saved first time.
     */
    const repairUntilValid = async (): Promise<void> => {
      while (hasFatal(errors) && repairs < MAX_REPAIR_ATTEMPTS) {
        checkCancelled();
        repairs++;

        deps.emit({
          type: "phase",
          phase: "repairing",
          label: `Fixing ${fatalCount(errors)} problem(s)`,
        });

        // An unreadable round leaves `errors` exactly as it was, so the loop
        // would spend its whole budget re-asking the same question. Stop and
        // let the caller deal with a graph that still does not validate.
        if (
          !(await revise(
            "repair",
            buildRepairPrompt(formatErrorsForLLM(errors))
          ))
        ) {
          return;
        }
      }
    };

    await repairUntilValid();

    if (hasFatal(errors)) {
      // Deliberately not saved. A graph that fails validation would be rejected
      // by the create endpoint anyway, and writing it straight to the store
      // just produces a workflow the editor cannot open.
      deps.emit({
        type: "error",
        code: "UNREPAIRABLE",
        message:
          "Could not produce a valid workflow. The closest attempt is shown above — try describing the steps in more detail.",
        recoverable: true,
      });
      return { outcome: "failed", ...totals() };
    }

    checkCancelled();

    // ── Save ──────────────────────────────────────────────────────────────
    deps.emit({ type: "phase", phase: "saving", label: "Saving it" });

    let examples = buildGeneratedExamples(draft, hydrated.workflow);
    // What is actually stored, which stops being `hydrated.workflow` the moment
    // a run-repair produces a correction that fails to validate.
    savedWorkflow = hydrated.workflow;
    savedDisarmed = hydrated.disarmed;
    // A critique corrects the workflow the user is looking at. Saving it as a
    // new one would leave them holding both, with no way to tell which is which.
    // `workflowId` is the hoisted one the catch reports from, so it is optional
    // by type. `savedId` is the same value proved present, which is what
    // everything below the save actually needs.
    const savedId = await deps.save(
      savedWorkflow,
      examples,
      deps.resume?.workflowId
    );
    workflowId = savedId;
    note({
      stage: "save",
      ok: true,
      workflowId: savedId,
      nodes: savedWorkflow.nodes.length,
      edges: savedWorkflow.edges.length,
      examples: examples.length,
    });
    deps.emit({
      type: "saved",
      workflowId: savedId,
      name: hydrated.workflow.name,
      // A blanked trigger binding means the workflow is a draft that will
      // never fire on its own — a fact the outcome screen owes the user,
      // because nothing else on it says so.
      ...(hydrated.disarmed.length > 0 && { dormant: true }),
    });

    checkCancelled();

    // ── Run ───────────────────────────────────────────────────────────────
    // Driven by the default example over the `inputOverrides` channel, which is
    // the same path the Run button takes — so what is tested here is what the
    // user gets when they run it themselves.

    /** Triggers whose trial payload is always invented, sample or not. */
    const PAYLOAD_TRIGGERS = new Set<string>([
      "email_message",
      "http_request",
      "http_webhook",
      "form_request",
      "form_webhook",
    ]);

    /**
     * Whether the invented example actually drove this run.
     *
     * `sampleName` used to be emitted whenever an example existed — and one
     * always exists — so a scheduled digest that read the user's *real* inbox
     * was still captioned "made-up sample data". Apologising for magic that
     * actually happened is worse than either honest answer.
     */
    const exampleDrove = (
      workflow: Workflow,
      example: WorkflowExample | undefined
    ): boolean => {
      if (!example) return false;
      if (PAYLOAD_TRIGGERS.has(workflow.trigger)) return true;
      return Object.keys(buildInputOverrides(example, workflow)).length > 0;
    };

    const testWith = async (
      workflow: Workflow,
      example: WorkflowExample | undefined
    ): Promise<WorkflowExecution> => {
      deps.emit({ type: "phase", phase: "running", label: "Trying it once" });
      if (example) {
        deps.emit({
          type: "log",
          level: "info",
          message: `Testing with example "${example.name}".`,
        });
      }

      return deps.run(
        workflow,
        savedId,
        buildTriggerParameters(workflow.trigger, example?.trigger, {
          apiHost: deps.apiHost,
        }),
        example ? buildInputOverrides(example, workflow) : undefined
      );
    };

    // ── Ask before acting outside Dafthunk ────────────────────────────────
    // Everything above this line is reversible: a saved workflow that nobody
    // ran has changed nothing in the world. The run below is the first step
    // that cannot be taken back, so it is the last point at which asking is
    // still worth anything.
    /**
     * Asks, reworks, and asks again about whatever the rework produced.
     *
     * A loop rather than a single question because the model does not reliably
     * do what the refusal asked: told "don't post it, just show me", it has
     * been observed *adding* an output node and leaving the post in place. One
     * pass would then save a workflow that still posts, under a screen saying
     * the user declined — the worst of both. So the corrected graph is put
     * through the same gate, and the loop only ends on a real answer.
     */
    let approvedToRun = true;

    if (deps.requestApproval) {
      for (let round = 0; round <= MAX_APPROVAL_ROUNDS; round++) {
        const actions = outwardActions(savedWorkflow, deps.nodeTypes);
        if (actions.length === 0) break;

        // Out of rounds with outward steps still in the graph. Not running is
        // the only safe end: the user has refused every version they saw.
        if (round === MAX_APPROVAL_ROUNDS) {
          approvedToRun = false;
          deps.emit({
            type: "log",
            level: "warn",
            message:
              "It still ends by sending something, so I left it saved and unrun.",
            important: true,
          });
          break;
        }

        deps.emit({
          type: "phase",
          phase: "approving",
          label: "Waiting for you",
        });

        const decision = await deps.requestApproval(actions);
        checkCancelled();

        const asked = {
          round,
          actions: actions.map((action) => action.nodeType),
        };

        if (decision.approved) {
          note({ stage: "approve", ok: true, ...asked, approved: true });
          break;
        }

        approvedToRun = false;

        // Their reason is the most precise thing they have said all session —
        // they are reacting to something concrete instead of describing it
        // from memory. So it is spent on a correction rather than logged.
        const reason = decision.reason?.trim();
        if (!reason) {
          note({ stage: "approve", ok: true, ...asked, approved: false });
          break;
        }

        deps.emit({
          type: "phase",
          phase: "repairing",
          label: "Changing it so it does not do that",
        });

        const reworked = await revise("decline", buildDeclinePrompt(reason));
        if (reworked) await repairUntilValid();

        const usable = reworked && !hasFatal(errors);
        note({
          stage: "approve",
          // A refusal we could not act on is a stage that did not do its job:
          // they asked for a change and got the graph they declined.
          ok: usable,
          ...asked,
          approved: false,
          reworked: usable,
        });

        // Only replace what is stored if the correction is actually usable. A
        // revision that does not validate — or that came back unreadable — is
        // worse than the graph they declined, which at least opens in the
        // editor.
        if (!usable) {
          deps.emit({
            type: "log",
            level: "warn",
            message:
              "I could not rework it from that, so the version you declined is what was saved — unrun.",
            // Without this the note is filtered out of the screen, leaving
            // "I changed it and left it unrun" with nothing to explain why
            // the change they asked for is not there.
            important: true,
          });
          break;
        }

        savedWorkflow = hydrated.workflow;
        savedDisarmed = hydrated.disarmed;
        examples = buildGeneratedExamples(draft, savedWorkflow);
        await deps.save(savedWorkflow, examples, workflowId);
        deps.emit({ type: "graph", workflow: savedWorkflow, attempt });

        // Round again: if the rework still acts outward, the next pass asks
        // about it rather than assuming the refusal was honoured.
        approvedToRun = true;
      }
    }

    if (!approvedToRun) {
      // Saying this plainly is the whole point. A screen that showed a result
      // here would mean the refusal did nothing.
      deps.emit({
        type: "log",
        level: "info",
        message: "Nothing was sent or posted — it was saved but not run.",
        important: true,
      });

      deps.onConversation?.(system, [
        ...messages,
        { role: "assistant", content: response.content },
      ]);

      deps.emit({ type: "phase", phase: "complete", label: "Saved, not run" });
      deps.emit({ type: "done", workflowId, outcome: "partial" });

      return {
        outcome: "partial",
        workflowId: savedId,
        workflow: savedWorkflow,
        disarmed: savedDisarmed,
        ...totals(),
      };
    }

    /** What a run did, in the terms a failure is diagnosed in. */
    const noteRun = (
      outcome: WorkflowExecution,
      workflow: Workflow,
      adopted?: boolean
    ) => {
      const typeById = new Map(
        workflow.nodes.map((node) => [node.id, node.type])
      );
      note({
        stage: "run",
        ok: outcome.status === "completed",
        attempt,
        status: outcome.status,
        failed: outcome.nodeExecutions
          .filter((node) => node.status === "error")
          .map((node) => ({
            nodeId: node.nodeId,
            ...(typeById.get(node.nodeId) && {
              type: typeById.get(node.nodeId),
            }),
            ...(node.error && { error: node.error.slice(0, 200) }),
          })),
        ...(adopted !== undefined && { adopted }),
      });
    };

    const firstSample = examples[0];
    execution = await testWith(savedWorkflow, firstSample);
    noteRun(execution, savedWorkflow);
    deps.emit({
      type: "run_result",
      execution: previewExecution(execution),
      ...(firstSample && exampleDrove(savedWorkflow, firstSample)
        ? { sampleName: firstSample.name }
        : {}),
    });

    // ── Repair a failed run ───────────────────────────────────────────────
    // Validation cannot see any of this: a literal the node refuses, a prompt
    // built wrongly, a node that cannot do the job. It is also the only failure
    // the user actually witnesses, so it is worth one round.
    let runRepairs = 0;
    while (
      execution.status !== "completed" &&
      runRepairs < MAX_RUN_REPAIR_ATTEMPTS
    ) {
      checkCancelled();
      runRepairs++;

      deps.emit({
        type: "phase",
        phase: "repairing",
        label: "Fixing what failed at run time",
      });

      const reworked = await revise(
        "run-repair",
        buildRunRepairPrompt(formatRunFailures(execution, savedWorkflow))
      );
      if (reworked) await repairUntilValid();

      if (!reworked || hasFatal(errors)) {
        // The correction is worse than what is already saved: it does not even
        // validate, or it could not be read at all. Keep the saved workflow and
        // its result rather than replacing something that runs with something
        // that cannot open.
        deps.emit({
          type: "log",
          level: "warn",
          message:
            "The attempted fix did not validate, so the first version was kept.",
        });
        break;
      }

      const candidateWorkflow = hydrated.workflow;
      const candidateExamples = buildGeneratedExamples(
        draft,
        candidateWorkflow
      );
      const candidateExecution = await testWith(
        candidateWorkflow,
        candidateExamples[0]
      );

      const improved = isRunImprovement(candidateExecution, execution);
      noteRun(candidateExecution, candidateWorkflow, improved);

      // Only adopt a repair that actually moved the run forward. Saving first
      // and comparing after would leave the worse graph on disk.
      if (!improved) {
        deps.emit({
          type: "log",
          level: "warn",
          message: `That change did not improve the run (${failedNodeCount(
            candidateExecution
          )} step(s) still failing, was ${failedNodeCount(
            execution
          )}), so the previous version was kept.`,
        });
        break;
      }

      savedWorkflow = candidateWorkflow;
      savedDisarmed = hydrated.disarmed;
      examples = candidateExamples;
      execution = candidateExecution;
      await deps.save(savedWorkflow, examples, workflowId);
      const adoptedSample = examples[0];
      deps.emit({
        type: "run_result",
        execution: previewExecution(execution),
        ...(adoptedSample && exampleDrove(savedWorkflow, adoptedSample)
          ? { sampleName: adoptedSample.name }
          : {}),
      });
    }

    // Handed back so a critique can continue this conversation rather than
    // re-describing the workflow to a model that has never seen it.
    deps.onConversation?.(system, [
      ...messages,
      { role: "assistant", content: response.content },
    ]);

    const outcome = execution.status === "completed" ? "ok" : "partial";
    deps.emit({
      type: "phase",
      phase: "complete",
      label: outcome === "ok" ? "Done" : "Finished with errors",
    });
    deps.emit({
      type: "done",
      workflowId,
      executionId: execution.id,
      outcome,
    });

    return {
      outcome,
      workflowId,
      executionId: execution.id,
      workflow: savedWorkflow,
      disarmed: savedDisarmed,
      ...totals(),
    };
  } catch (error) {
    const cancelled = error instanceof Cancelled;

    if (!cancelled) {
      console.error("[WorkflowGenerator] pipeline threw:", error);
    }

    /**
     * A workflow that exists is reported, whatever went wrong afterwards.
     *
     * Everything past the save can still throw — a repair round that cannot
     * reach the gateway, a second trial run that fails outright, a re-save that
     * is rejected. Reporting `failed` there would tell the user nothing was
     * built while a saved, possibly working workflow sat in their workspace
     * with no link to it from the session that made it. The rule is simple
     * enough to state and worth stating: once it is saved, no later failure may
     * report it as absent.
     *
     * `partial` rather than `ok` in every case — the run either did not happen
     * or did not finish being judged, and claiming success for something that
     * was interrupted is the one thing worse than saying it broke.
     */
    if (workflowId) {
      deps.emit({
        type: "error",
        code: cancelled ? "CANCELLED" : "LLM_FAILED",
        // The raw error goes to the log above, never into this sentence — the
        // moment something breaks is when the voice has to hold.
        message: cancelled
          ? "Stopped — the workflow was saved before it stopped."
          : "I hit a problem partway through, but the workflow was saved — it's in your workspace.",
        recoverable: true,
      });
      deps.emit({
        type: "phase",
        phase: "complete",
        label: "Saved, finished early",
      });
      deps.emit({
        type: "done",
        workflowId,
        ...(execution && { executionId: execution.id }),
        outcome: "partial",
      });

      return {
        outcome: "partial",
        workflowId,
        ...(execution && { executionId: execution.id }),
        ...(savedWorkflow && { workflow: savedWorkflow }),
        disarmed: savedDisarmed,
        ...totals(),
      };
    }

    if (cancelled) {
      deps.emit({
        type: "error",
        code: "CANCELLED",
        message: "Stopped. Nothing was saved yet.",
        recoverable: true,
      });
      return { outcome: "failed", ...totals() };
    }

    deps.emit({
      type: "error",
      code: "LLM_FAILED",
      message:
        "Something broke on my end while building that. Your request was fine — try again.",
      recoverable: true,
    });
    return { outcome: "failed", ...totals() };
  }
}
