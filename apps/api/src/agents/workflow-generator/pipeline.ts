import type { InputOverrides } from "@dafthunk/runtime";
import { integrationProvider, isOutward } from "@dafthunk/runtime";
import type {
  BriefDestination,
  Edge,
  GenerationValidationIssue,
  GeneratorServerMessage,
  RehearsalReport,
  RehearsedNode,
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
import type { ModelTier } from "./config";
import { MAX_REPAIR_ATTEMPTS, MAX_RUN_REPAIR_ATTEMPTS } from "./config";
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
import type { BoundResource, DisarmedInput } from "./hydrate";
import { hydrateGeneratedWorkflow } from "./hydrate";
import type { GenerateCall, GenerateResult, TierUsage } from "./llm";
import { emptyTierUsage } from "./llm";
import type { OrgResourceType } from "./org-resources";
import { boundResourceNote, describeMissingResource } from "./org-resources";
import { parseJsonObject } from "./parse-json";
import {
  buildCritiquePrompt,
  buildEarlyPlanPrompt,
  buildRepairPrompt,
  buildRunRepairPrompt,
  buildUserPrompt,
  earlyPlanBriefing,
  renderCatalog,
  synthesisBriefing,
} from "./projection";
import { providerLabel } from "./provider-labels";
import type { CreateResourceFn } from "./resource-resolver";
import { createResourceResolver } from "./resource-resolver";
import { deriveSchemaShapes } from "./schema-shapes";
import type { DraftKind, TraceEntry } from "./trace";
import { normalizeTrigger } from "./triggers";
import type { Workspace } from "./workspace";

/**
 * What one revision round produced.
 *
 * `empty` and `unusable` are both failures, and the difference is whether
 * asking again could help. An unusable round came back truncated or fenced —
 * a formatting failure that will most likely repeat, so re-asking spends the
 * budget on the same wall. An empty one parsed cleanly and simply named no
 * nodes; the errors are unchanged and the next round starts from the same
 * place, so it is worth one more turn of the budget rather than the end of the
 * generation.
 */
type RevisionOutcome = "revised" | "empty" | "unusable";

export interface PipelineDependencies {
  prompt: string;
  /**
   * What can be built here: the catalog, the org's components, the connected
   * accounts, the grounding the prompts are written against. The brief was
   * held to this same picture, which is what stops the sentence promising
   * something the graph cannot deliver.
   */
  workspace: Workspace;
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
  /**
   * The trial run. Always called with `{ rehearsal: true }`: outward writes
   * are stubbed at the registry level so nothing leaves the platform. The
   * flag is stated here, at the seam, rather than defaulted inside any one
   * implementer — a harness that wires its own executor must see it and
   * forward it, or it would silently run live.
   */
  run: (
    workflow: Workflow,
    workflowId: string,
    parameters: WorkflowExecutorParameters,
    inputOverrides?: InputOverrides,
    options?: { rehearsal: boolean }
  ) => Promise<WorkflowExecution>;
  isCancelled?: () => boolean;
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
 * What actually arrived, when what arrived had no nodes in it.
 *
 * An empty revision is the largest single cause of a failed generation — four
 * of the five failures in the 2026-08-13 sweep — and until now it recorded
 * nothing about the response beyond the fact that it was empty. That is a
 * dead end: the rounds in question produced seventeen hundred output tokens,
 * so the model wrote something substantial, and no log said what.
 *
 * Keys and counts, never content. A draft can run to kilobytes, and the
 * question this has to answer is structural — did the graph arrive under a
 * different key, did edges survive when nodes did not, was it prose in a JSON
 * wrapper. All three look identical today.
 */
function describeDraftShape(content: string): string {
  try {
    const parsed = parseJsonObject(content);
    const keys = Object.keys(parsed);
    const count = (value: unknown) =>
      Array.isArray(value) ? value.length : "absent";

    return `keys: ${keys.join(",") || "(none)"}; nodes=${count(parsed.nodes)}, edges=${count(parsed.edges)}, steps=${count(parsed.steps)}`;
  } catch {
    // Unreachable from the empty branch, which only runs after a clean parse,
    // but this must never be the thing that throws inside a failure path.
    return "unparseable on re-read";
  }
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
  const { workspace } = deps;
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
    enrichValidation(result.workflow, workspace.nodeTypes, result.errors, {
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
    const { candidates, withheld, unconnected } = workspace.candidates(
      deps.prompt,
      deps.destination?.nodeTypes ?? []
    );
    const renderedCatalog = renderCatalog(candidates, workspace.nodeTypes);
    const unconnectedProviders = [
      ...new Set(unconnected.map((entry) => entry.provider)),
    ];

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
        catalog: workspace.nodeTypes.length,
        // The same string the prompt carries, rendered once and handed to the
        // briefing below — measuring it used to mean building the whole
        // catalog section a second time and keeping only its length.
        catalogChars: renderedCatalog.length,
        offeredTypes,
        required: [...required],
        missingRequired,
        withheldProviders: withheldProviders(withheld),
        withheldResources: withheldResources(withheld),
        // Admitted despite no connected account — these steps will rehearse.
        // In the trace to make catalog dilution measurable.
        unconnectedProviders,
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
        message: `Considering ${candidates.length} of ${workspace.nodeTypes.length} node types.`,
      });

      // Only providers this deployment cannot offer at all end up here now —
      // an unconnected-but-available provider is offered and rehearsed
      // instead, with its own note after the graph is saved.
      for (const provider of withheldProviders(withheld)) {
        deps.emit({
          type: "log",
          level: "warn",
          message: `This looks like it wanted ${providerLabel(provider)}, which is not available on this deployment — so those steps are left out.`,
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
            workspace.orgResources[type]?.length ?? 0
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
    const resolver = createResourceResolver(workspace.orgResources, {
      create: deps.createResource,
      briefBindings: deps.resourceBindings,
    });

    const hydrate = async (input: GeneratedWorkflowDraft) => {
      // Shapes the graph implies but the draft never declared. Appended rather
      // than resolved separately: a derived shape is matched against what the
      // workspace owns under exactly the same rules as a declared one.
      const resolution = await resolver.resolve([
        ...(Array.isArray(input.resources) ? input.resources : []),
        ...deriveSchemaShapes({ draft: input, nodeTypes: workspace.nodeTypes }),
      ]);
      for (const created of resolution.created) {
        createdResources.push({
          type: created.type,
          name: created.resource.name,
        });
      }
      for (const message of resolution.notes) {
        deps.emit({ type: "log", level: "info", message, important: true });
      }
      return hydrateGeneratedWorkflow(input, workspace.nodeTypes, candidates, {
        ownerEmail:
          deps.destination?.kind === "email" ? workspace.ownerEmail : undefined,
        orgResources: workspace.orgResources,
        bindings: resolution.bindings,
        schemasByNode: resolution.schemasByNode,
        integrations: workspace.integrationsByProvider,
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

    const briefing = synthesisBriefing({
      catalog: candidates,
      nodeTypes: workspace.nodeTypes,
      withheld,
      unconnectedProviders,
      query: deps.prompt,
      destination: deps.destination,
      grounding: workspace.grounding,
      renderedCatalog,
    });

    // A resumed turn replays the system prompt of the turn it continues, so the
    // model is corrected against the catalog it was originally shown.
    const system = deps.resume?.system ?? briefing.system;

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
      const earlyPlan = earlyPlanBriefing();
      void deps
        .callLLM({
          tier: "fast",
          system: earlyPlan.system,
          messages: [
            { role: "user", content: buildEarlyPlanPrompt(deps.prompt) },
          ],
          schema: earlyPlan.schema,
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

    let response = await deps.callLLM({
      system,
      messages,
      schema: briefing.schema,
    });
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
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        systemChars: system.length,
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

    // Same visibility rule for accounts: a workflow wired to somebody's real
    // Gmail must say so before anything else happens.
    for (const bound of hydrated.boundIntegrations) {
      deps.emit({
        type: "log",
        level: "info",
        message: `Used your connected ${providerLabel(bound.provider)} account "${bound.name}".`,
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
    ): Promise<RevisionOutcome> => {
      attempt++;

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: instruction });

      response = await deps.callLLM({
        system,
        messages,
        schema: briefing.schema,
      });
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
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          systemChars: system.length,
          types: [],
        });
        return "unusable";
      }

      /**
       * A revision that names nothing is a failed round, not a new graph.
       *
       * Taking it would trade a draft that exists for one that does not, and
       * the loss is invisible downstream: `hydrate` injects the trigger, so the
       * result is a graph rather than an empty one, and by the time validation
       * sees it the eleven nodes it replaced are gone. Measured doing exactly
       * that — an eleven-node queue workflow whose repair round returned no
       * nodes, saved at one node and zero edges, reported as a success.
       *
       * Guarded on the draft in hand rather than unconditionally: an initial
       * round that returns nothing has nothing better to keep, and belongs to
       * `EMPTY_WORKFLOW` and the repair budget.
       */
      if (revised.nodes.length === 0 && draft.nodes.length > 0) {
        const reason = `the revision named no nodes — ${describeDraftShape(response.content)}`;
        console.warn(
          `[WorkflowGenerator] discarding an empty revision: ${reason}`
        );
        note({
          stage: "draft",
          ok: false,
          attempt,
          kind,
          reason,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          systemChars: system.length,
          types: [],
        });
        return "empty";
      }

      draft = revised;
      hydrated = await hydrate(draft);
      errors = validate(hydrated);

      noteDraft(kind);
      noteGraph();

      deps.emit({ type: "graph", workflow: hydrated.workflow, attempt });
      deps.emit({ type: "validation", attempt, issues: toIssues(errors) });
      return "revised";
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
        //
        // An empty round is the one failure worth re-asking: it parsed, so the
        // model is answering in the right shape and simply produced nothing
        // this time. Continuing costs one attempt of a bounded budget and
        // keeps the draft already in hand, which is what the round would have
        // thrown away.
        const outcome = await revise(
          "repair",
          buildRepairPrompt(formatErrorsForLLM(errors))
        );
        if (outcome === "unusable") return;
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
      deps.emit({
        type: "phase",
        phase: "running",
        label: "Trying it once, safely",
      });
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
        example ? buildInputOverrides(example, workflow) : undefined,
        // Always a rehearsal. This is what lets the run below happen unasked:
        // outward writes are stubbed at the registry level, so a graph ending
        // in "post it" composes the post and sends nothing.
        { rehearsal: true }
      );
    };

    /**
     * What the rehearsal will stub, read from the graph itself.
     *
     * Derived statically rather than collected from the run because it
     * mirrors the registry's own rule exactly: an outward node is always
     * stubbed, and a node whose required integration input carries no id is
     * stubbed with fixtures. Integration inputs are hidden and never fed by
     * edges, so what is on the node is what the run will see.
     */
    const rehearsalReport = (
      workflow: Workflow
    ): RehearsalReport | undefined => {
      const byType = new Map(workspace.nodeTypes.map((nt) => [nt.type, nt]));
      const nodes: RehearsedNode[] = [];
      const unconnected = new Set<string>();

      for (const node of workflow.nodes) {
        const nodeType = byType.get(node.type);
        if (!nodeType) continue;

        const unbound = node.inputs.filter(
          (input) =>
            input.type === "integration" && input.required && !input.value
        );
        for (const input of unbound) {
          if (input.type === "integration") unconnected.add(input.provider);
        }

        if (isOutward(nodeType) || unbound.length > 0) {
          const provider = integrationProvider(nodeType);
          nodes.push({ nodeId: node.id, ...(provider ? { provider } : {}) });
        }
      }

      if (nodes.length === 0) return undefined;
      return { nodes, unconnectedProviders: [...unconnected] };
    };

    // Nothing needs asking anymore: the rehearsal is safe by construction.
    // What remains owed to the user is the fact that some steps will only be
    // rehearsed until an account is linked — said before the run, with the
    // place to fix it.
    const initialReport = rehearsalReport(savedWorkflow);
    for (const provider of initialReport?.unconnectedProviders ?? []) {
      deps.emit({
        type: "log",
        level: "warn",
        message: `Uses a ${providerLabel(provider)} account that isn't connected yet — those steps run on stand-in data until you connect it.`,
        link: "integrations",
        important: true,
      });
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
      ...(initialReport ? { rehearsal: initialReport } : {}),
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

      // Either failure mode leaves the saved workflow standing, so the two
      // collapse here — unlike in `repairUntilValid`, there is nothing to
      // re-ask against: a run repair that produced nothing has no corrected
      // graph to hold the budget open for.
      const reworked =
        (await revise(
          "run-repair",
          buildRunRepairPrompt(formatRunFailures(execution, savedWorkflow))
        )) === "revised";
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
      const adoptedReport = rehearsalReport(savedWorkflow);
      deps.emit({
        type: "run_result",
        execution: previewExecution(execution),
        ...(adoptedSample && exampleDrove(savedWorkflow, adoptedSample)
          ? { sampleName: adoptedSample.name }
          : {}),
        ...(adoptedReport ? { rehearsal: adoptedReport } : {}),
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
