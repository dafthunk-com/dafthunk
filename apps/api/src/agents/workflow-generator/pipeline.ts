import type { InputOverrides } from "@dafthunk/runtime";
import type {
  GenerationValidationIssue,
  GeneratorServerMessage,
  NodeType,
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
import {
  MAX_CANDIDATE_NODE_TYPES,
  MAX_REPAIR_ATTEMPTS,
  MAX_RUN_REPAIR_ATTEMPTS,
} from "./config";
import { CORE_NODE_TYPES } from "./core-nodes";
import type {
  EnrichedValidationError,
  GeneratedWorkflowDraft,
} from "./draft-types";
import { filterEligible, withheldProviders } from "./eligibility";
import { enrichValidation, formatErrorsForLLM } from "./enrich-validation";
import { buildGeneratedExamples } from "./examples";
import { hydrateGeneratedWorkflow, normalizeTrigger } from "./hydrate";
import { scoreNodeTypes } from "./node-search";
import {
  buildRepairPrompt,
  buildRunRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "./prompts";

/** One LLM round trip, provider-agnostic so tests can stub it. */
export interface GenerateCall {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface GenerateResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export interface PipelineDependencies {
  prompt: string;
  /** Live registry types; never a hardcoded snapshot. */
  nodeTypes: NodeType[];
  plan: "pro" | "trial";
  connectedProviders: ReadonlySet<string>;
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
}

export interface PipelineResult {
  outcome: "ok" | "partial" | "failed";
  workflowId?: string;
  executionId?: string;
  workflow?: Workflow;
  inputTokens: number;
  outputTokens: number;
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
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : content;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response contained no JSON object");
  }

  const parsed = JSON.parse(candidate.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model response was not an object");
  }

  return {
    title: String(parsed.title ?? "Generated Workflow"),
    description: String(parsed.description ?? ""),
    trigger: parsed.trigger,
    steps: Array.isArray(parsed.steps) ? parsed.steps.map(String) : [],
    nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
    edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    // Shape is checked in `buildGeneratedExamples`, which has the graph to check
    // it against; here it only has to survive the parse.
    examples: Array.isArray(parsed.examples) ? parsed.examples : undefined,
    sampleTrigger:
      parsed.sampleTrigger && typeof parsed.sampleTrigger === "object"
        ? parsed.sampleTrigger
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
  plan: "pro" | "trial",
  connectedProviders: ReadonlySet<string>
) {
  const withPseudo = [...nodeTypes, ...pseudoNodeTypes()];
  const { eligible, byType, withheld } = filterEligible(withPseudo, {
    plan,
    connectedProviders,
  });

  const ranked = scoreNodeTypes(query, eligible)
    .slice(0, MAX_CANDIDATE_NODE_TYPES)
    .map((scored) => scored.nodeType);

  const chosen = new Map(ranked.map((nt) => [nt.type, nt]));
  for (const type of CORE_NODE_TYPES) {
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
  let inputTokens = 0;
  let outputTokens = 0;

  const checkCancelled = () => {
    if (deps.isCancelled?.()) throw new Cancelled();
  };

  try {
    // ── Select ────────────────────────────────────────────────────────────
    deps.emit({
      type: "phase",
      phase: "selecting",
      label: "Choosing node types",
    });

    const { candidates, withheld } = selectCandidates(
      deps.prompt,
      deps.nodeTypes,
      deps.plan,
      deps.connectedProviders
    );
    deps.emit({
      type: "log",
      level: "info",
      message: `Considering ${candidates.length} of ${deps.nodeTypes.length} node types.`,
    });

    for (const provider of withheldProviders(withheld)) {
      deps.emit({
        type: "log",
        level: "warn",
        message: `${provider} is not connected in this workspace, so those steps are left out. Connect it in Settings to include them.`,
      });
    }

    checkCancelled();

    // ── Generate ──────────────────────────────────────────────────────────
    deps.emit({ type: "phase", phase: "planning", label: "Planning" });

    const system = buildSystemPrompt({
      catalog: candidates,
      nodeTypes: deps.nodeTypes,
      withheld,
      query: deps.prompt,
    });

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: buildUserPrompt(deps.prompt) },
    ];

    deps.emit({ type: "phase", phase: "generating", label: "Building graph" });

    let response = await deps.callLLM({ system, messages });
    inputTokens += response.inputTokens;
    outputTokens += response.outputTokens;

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
    let hydrated = hydrateGeneratedWorkflow(draft, deps.nodeTypes, candidates);
    let errors = enrichValidation(
      hydrated.workflow,
      deps.nodeTypes,
      hydrated.errors
    );

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
        inputTokens += response.inputTokens;
        outputTokens += response.outputTokens;

        draft = parseDraft(response.content);
        hydrated = hydrateGeneratedWorkflow(draft, deps.nodeTypes, candidates);
        errors = enrichValidation(
          hydrated.workflow,
          deps.nodeTypes,
          hydrated.errors
        );

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
      return { outcome: "failed", inputTokens, outputTokens };
    }

    checkCancelled();

    // ── Save ──────────────────────────────────────────────────────────────
    deps.emit({ type: "phase", phase: "saving", label: "Saving workflow" });

    let examples = buildGeneratedExamples(draft, hydrated.workflow);
    // What is actually stored, which stops being `hydrated.workflow` the moment
    // a run-repair produces a correction that fails to validate.
    let savedWorkflow = hydrated.workflow;
    const workflowId = await deps.save(savedWorkflow, examples);
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

    let execution = await testWith(savedWorkflow, examples[0]);
    deps.emit({ type: "run_result", execution });

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
      inputTokens += response.inputTokens;
      outputTokens += response.outputTokens;

      draft = parseDraft(response.content);
      hydrated = hydrateGeneratedWorkflow(draft, deps.nodeTypes, candidates);
      errors = enrichValidation(
        hydrated.workflow,
        deps.nodeTypes,
        hydrated.errors
      );

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

      savedWorkflow = hydrated.workflow;
      examples = buildGeneratedExamples(draft, savedWorkflow);
      await deps.save(savedWorkflow, examples, workflowId);
      execution = await testWith(savedWorkflow, examples[0]);
      deps.emit({ type: "run_result", execution });
    }

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
      inputTokens,
      outputTokens,
    };
  } catch (error) {
    if (error instanceof Cancelled) {
      deps.emit({
        type: "error",
        code: "CANCELLED",
        message: "Generation cancelled.",
        recoverable: true,
      });
      return { outcome: "failed", inputTokens, outputTokens };
    }

    const message = error instanceof Error ? error.message : String(error);
    deps.emit({
      type: "error",
      code: "LLM_FAILED",
      message: `Generation failed: ${message}`,
      recoverable: true,
    });
    return { outcome: "failed", inputTokens, outputTokens };
  }
}
