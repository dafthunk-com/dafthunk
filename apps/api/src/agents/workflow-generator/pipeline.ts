import type { InputOverrides } from "@dafthunk/runtime";
import type {
  BriefDestination,
  Edge,
  GenerationValidationIssue,
  GeneratorServerMessage,
  NodeType,
  OutwardAction,
  Workflow,
  WorkflowExample,
  WorkflowExecution,
} from "@dafthunk/types";
import type { WorkflowExecutorParameters } from "../../services/workflow-executor";
import {
  buildInputOverrides,
  buildTriggerParameters,
} from "../../utils/example-inputs";
import { pseudoNodeTypes } from "./ai-nodes";
import type { ModelTier } from "./config";
import {
  MAX_APPROVAL_ROUNDS,
  MAX_CANDIDATE_NODE_TYPES,
  MAX_REPAIR_ATTEMPTS,
  MAX_RUN_REPAIR_ATTEMPTS,
  WITHHELD_RELEVANCE_RATIO,
} from "./config";
import { CORE_NODE_TYPES } from "./core-nodes";
import type {
  DraftExample,
  DraftNode,
  EnrichedValidationError,
  GeneratedWorkflowDraft,
} from "./draft-types";
import {
  filterEligible,
  withheldProviders,
  withheldResources,
} from "./eligibility";
import { enrichValidation, formatErrorsForLLM } from "./enrich-validation";
import { buildGeneratedExamples } from "./examples";
import { previewExecution } from "./execution-preview";
import { hydrateGeneratedWorkflow, normalizeTrigger } from "./hydrate";
import { scoreNodeTypes } from "./node-search";
import type { OrgResources, OrgResourceType } from "./org-resources";
import {
  bindableResources,
  boundResourceNote,
  describeMissingResource,
} from "./org-resources";
import { outwardActions } from "./outward-actions";
import { parseJsonObject } from "./parse-json";
import {
  buildCritiquePrompt,
  buildDeclinePrompt,
  buildRepairPrompt,
  buildRunRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "./prompts";

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
    system: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    note: string;
    workflowId: string;
  };
  /** Hands back the conversation so a later critique can pick it up. */
  onConversation?: (
    system: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>
  ) => void;
}

export interface PipelineResult {
  outcome: "ok" | "partial" | "failed";
  workflowId?: string;
  executionId?: string;
  workflow?: Workflow;
  /** Totals across every tier, kept because most callers only want the sum. */
  inputTokens: number;
  outputTokens: number;
  /** The same tokens split by tier, which is what prices correctly. */
  usage: TierUsage;
}

class Cancelled extends Error {}

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
    sampleTrigger:
      parsed.sampleTrigger && typeof parsed.sampleTrigger === "object"
        ? (parsed.sampleTrigger as Record<string, unknown>)
        : undefined,
  };
}

/**
 * Selects the node types shown to the model: keyword-ranked matches, plus a
 * guaranteed floor of glue and output nodes, plus the curated AI stand-ins.
 */
export function selectCandidates(
  query: string,
  nodeTypes: NodeType[],
  connectedProviders: ReadonlySet<string>,
  /**
   * Node types that realize the promised destination.
   *
   * Forced into the catalog rather than left to keyword luck. The prompt tells
   * the model which type to deliver with, but a type it cannot see the ports of
   * is a type it has to guess at — and the destination is very often something
   * the request never mentioned (an unstated "email it to me" is the whole
   * reason the brief exists), so it scores nothing and would be cut.
   */
  required: readonly string[] = [],
  /** Resource types the org owns that may be bound without review. */
  bindable: ReadonlySet<string> = new Set()
) {
  const withPseudo = [...nodeTypes, ...pseudoNodeTypes()];
  const { eligible, byType, withheld } = filterEligible(withPseudo, {
    connectedProviders,
    bindableResources: bindable,
  });

  /**
   * Which unusable nodes the request was actually reaching for.
   *
   * "Scored at all" is too loose a test: "post a slack message" shares the
   * token "post" with every blogging node, which would announce WordPress to
   * someone who never mentioned it. The question worth answering is whether
   * the node would have been *offered to the model* had it been usable — so
   * everything is ranked together and the same cut applied.
   */
  const withheldByType = new Map(withheld.map((entry) => [entry.type, entry]));
  const allRanked = scoreNodeTypes(
    query,
    withPseudo.filter((nodeType) => !nodeType.trigger && !nodeType.responder)
  );
  const topScore = allRanked[0]?.score ?? 0;

  for (const scored of allRanked) {
    if (scored.score < topScore * WITHHELD_RELEVANCE_RATIO) break;
    const entry = withheldByType.get(scored.nodeType.type);
    if (entry) entry.relevant = true;
  }

  const ranked = scoreNodeTypes(query, eligible)
    .slice(0, MAX_CANDIDATE_NODE_TYPES)
    .map((scored) => scored.nodeType);

  const chosen = new Map(ranked.map((nt) => [nt.type, nt]));
  for (const type of [...required, ...CORE_NODE_TYPES]) {
    if (chosen.has(type)) continue;
    const nodeType = byType.get(type);
    if (nodeType) chosen.set(type, nodeType);
  }

  return { candidates: [...chosen.values()], withheld };
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

  /** Totals, recomputed at every exit so no path can forget to sum. */
  const totals = () => ({
    inputTokens: usage.fast.inputTokens + usage.synthesis.inputTokens,
    outputTokens: usage.fast.outputTokens + usage.synthesis.outputTokens,
    usage,
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

  try {
    // ── Select ────────────────────────────────────────────────────────────
    // Candidate types are needed either way: hydration resolves the model's
    // type names against them, including on a resumed turn.
    const { candidates, withheld } = selectCandidates(
      deps.prompt,
      deps.nodeTypes,
      deps.connectedProviders,
      deps.destination?.nodeTypes ?? [],
      deps.orgResources ? bindableResources(deps.orgResources) : new Set()
    );

    if (!deps.resume) {
      deps.emit({
        type: "phase",
        phase: "selecting",
        label: "Choosing node types",
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
     */
    const hydrate = (input: GeneratedWorkflowDraft) =>
      hydrateGeneratedWorkflow(
        input,
        deps.nodeTypes,
        candidates,
        deps.destination?.kind === "email" ? deps.ownerEmail : undefined,
        deps.orgResources
      );

    // ── Generate ──────────────────────────────────────────────────────────
    if (!deps.resume) {
      deps.emit({ type: "phase", phase: "planning", label: "Planning" });
    }

    const system = deps.resume
      ? deps.resume.system
      : buildSystemPrompt({
          catalog: candidates,
          nodeTypes: deps.nodeTypes,
          withheld,
          query: deps.prompt,
          destination: deps.destination,
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
        : { type: "phase", phase: "generating", label: "Building graph" }
    );

    let response = await deps.callLLM({ system, messages });
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
    let hydrated = hydrate(draft);
    let errors = validate(hydrated);

    // Said once, on the first graph. A binding the user did not choose has to
    // be visible, or a workflow quietly reads from the wrong database.
    for (const bound of hydrated.boundResources) {
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
      label: "Checking the graph",
    });
    deps.emit({ type: "validation", attempt, issues: toIssues(errors) });

    /**
     * Repairs until the graph validates or the budget runs out. Called again
     * after a failed run, so a correction is held to the same bar as the
     * original: nothing is saved that would not have been saved first time.
     */
    const repairUntilValid = async (): Promise<void> => {
      while (
        errors.some((e) => e.severity === "fatal") &&
        repairs < MAX_REPAIR_ATTEMPTS
      ) {
        checkCancelled();
        attempt++;
        repairs++;

        deps.emit({
          type: "phase",
          phase: "repairing",
          label: `Fixing ${errors.filter((e) => e.severity === "fatal").length} problem(s)`,
        });

        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: buildRepairPrompt(formatErrorsForLLM(errors)),
        });

        response = await deps.callLLM({ system, messages });
        record(response);

        draft = parseDraft(response.content);
        hydrated = hydrate(draft);
        errors = validate(hydrated);

        deps.emit({ type: "graph", workflow: hydrated.workflow, attempt });
        deps.emit({ type: "validation", attempt, issues: toIssues(errors) });
      }
    };

    await repairUntilValid();

    if (errors.some((e) => e.severity === "fatal")) {
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
    deps.emit({ type: "phase", phase: "saving", label: "Saving workflow" });

    let examples = buildGeneratedExamples(draft, hydrated.workflow);
    // What is actually stored, which stops being `hydrated.workflow` the moment
    // a run-repair produces a correction that fails to validate.
    let savedWorkflow = hydrated.workflow;
    // A critique corrects the workflow the user is looking at. Saving it as a
    // new one would leave them holding both, with no way to tell which is which.
    const workflowId = await deps.save(
      savedWorkflow,
      examples,
      deps.resume?.workflowId
    );
    deps.emit({
      type: "saved",
      workflowId,
      name: hydrated.workflow.name,
    });

    checkCancelled();

    // ── Run ───────────────────────────────────────────────────────────────
    // Driven by the default example over the `inputOverrides` channel, which is
    // the same path the Run button takes — so what is tested here is what the
    // user gets when they run it themselves.
    const testWith = async (
      workflow: Workflow,
      example: WorkflowExample | undefined
    ): Promise<WorkflowExecution> => {
      deps.emit({ type: "phase", phase: "running", label: "Running it once" });
      if (example) {
        deps.emit({
          type: "log",
          level: "info",
          message: `Testing with example "${example.name}".`,
        });
      }

      return deps.run(
        workflow,
        workflowId,
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

        if (decision.approved) break;

        approvedToRun = false;

        // Their reason is the most precise thing they have said all session —
        // they are reacting to something concrete instead of describing it
        // from memory. So it is spent on a correction rather than logged.
        const reason = decision.reason?.trim();
        if (!reason) break;

        attempt++;
        deps.emit({
          type: "phase",
          phase: "repairing",
          label: "Changing it so it does not do that",
        });

        messages.push({ role: "assistant", content: response.content });
        messages.push({ role: "user", content: buildDeclinePrompt(reason) });

        response = await deps.callLLM({ system, messages });
        record(response);

        draft = parseDraft(response.content);
        hydrated = hydrate(draft);
        errors = validate(hydrated);

        deps.emit({ type: "graph", workflow: hydrated.workflow, attempt });
        deps.emit({ type: "validation", attempt, issues: toIssues(errors) });

        await repairUntilValid();

        // Only replace what is stored if the correction is actually usable. A
        // revision that does not validate is worse than the graph they
        // declined, which at least opens in the editor.
        if (errors.some((e) => e.severity === "fatal")) {
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
        workflowId,
        workflow: savedWorkflow,
        ...totals(),
      };
    }

    let execution = await testWith(savedWorkflow, examples[0]);
    deps.emit({
      type: "run_result",
      execution: previewExecution(execution),
      ...(examples[0] && { sampleName: examples[0].name }),
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
      attempt++;

      deps.emit({
        type: "phase",
        phase: "repairing",
        label: "Fixing what failed at run time",
      });

      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: buildRunRepairPrompt(
          formatRunFailures(execution, savedWorkflow)
        ),
      });

      response = await deps.callLLM({ system, messages });
      record(response);

      draft = parseDraft(response.content);
      hydrated = hydrate(draft);
      errors = validate(hydrated);

      deps.emit({ type: "graph", workflow: hydrated.workflow, attempt });
      deps.emit({ type: "validation", attempt, issues: toIssues(errors) });

      await repairUntilValid();

      if (errors.some((e) => e.severity === "fatal")) {
        // The correction is worse than what is already saved: it does not even
        // validate. Keep the saved workflow and its result rather than
        // replacing something that runs with something that cannot open.
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

      // Only adopt a repair that actually moved the run forward. Saving first
      // and comparing after would leave the worse graph on disk.
      if (!isRunImprovement(candidateExecution, execution)) {
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
      examples = candidateExamples;
      execution = candidateExecution;
      await deps.save(savedWorkflow, examples, workflowId);
      deps.emit({
        type: "run_result",
        execution: previewExecution(execution),
        ...(examples[0] && { sampleName: examples[0].name }),
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
      ...totals(),
    };
  } catch (error) {
    if (error instanceof Cancelled) {
      deps.emit({
        type: "error",
        code: "CANCELLED",
        message: "Generation cancelled.",
        recoverable: true,
      });
      return { outcome: "failed", ...totals() };
    }

    const message = error instanceof Error ? error.message : String(error);
    deps.emit({
      type: "error",
      code: "LLM_FAILED",
      message: `Generation failed: ${message}`,
      recoverable: true,
    });
    return { outcome: "failed", ...totals() };
  }
}
