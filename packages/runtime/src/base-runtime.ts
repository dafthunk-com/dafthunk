import { NonRetryableError } from "cloudflare:workflows";
import type {
  Workflow,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

import { executeDataflow } from "./dataflow-scheduler";
import { computeDefinitionHash } from "./definition-hash";
import { ExecutionGraph } from "./execution-graph";
import { buildNodeExecutions, type PendingEvent } from "./execution-report";
import { getExecutionStatus } from "./execution-state";
import type {
  ExecutionState,
  InputOverrides,
  NodeExecutionResult,
  WorkflowExecutionContext,
} from "./execution-types";
import { NodeExecutor } from "./node-executor";
import { nodeOutputsToApi } from "./parameter-mapper";
import type { RuntimeDependencies } from "./runtime-dependencies";
import { extractTrigger, type TriggerContext } from "./trigger";
import { validateWorkflow } from "./validate-workflow";

export type { RuntimeDependencies } from "./runtime-dependencies";

/**
 * Everything a single workflow run needs. This is the Cloudflare Workflows
 * event payload, so it must stay JSON-serializable and backward compatible:
 * instances parked on `waitForEvent` resume against whatever code is deployed
 * when their event finally arrives.
 */
export interface RuntimeParams extends TriggerContext {
  readonly workflow: Workflow;
  readonly userId: string;
  readonly organizationId: string;
  readonly computeCredits: number;
  readonly subscriptionStatus?: string;
  /** Maximum additional usage allowed beyond included credits. null = unlimited */
  readonly overageLimit?: number | null;
  /** When true, all credit checks are bypassed (e.g., internal/test accounts). */
  readonly unlimitedUsage?: boolean;
  readonly userPlan?: string;
  readonly inputOverrides?: InputOverrides;
}

/** Everything derived once at the start of a run and used throughout it. */
interface PreparedRun {
  readonly context: WorkflowExecutionContext;
  readonly graph: ExecutionGraph;
  readonly state: ExecutionState;
}

/**
 * Abstract workflow execution engine.
 *
 * Owns the *lifecycle* of a run — validate, check credits, execute, settle
 * usage, persist — and delegates the rest: {@link ExecutionGraph} indexes the
 * workflow, `executeDataflow` decides which node runs when, {@link NodeExecutor}
 * runs each one, and `buildNodeExecutions` projects state for reporting.
 *
 * Subclasses supply only the platform primitives below. That is the entire
 * difference between running on Cloudflare Workflows and running on a bare
 * Worker.
 *
 * A Runtime holds no per-run state, so one instance can serve concurrent runs.
 *
 * @see {@link WorkflowRuntime} durable execution via Cloudflare Workflows
 * @see {@link WorkerRuntime} direct execution, no durability
 */
export abstract class Runtime<Env = unknown> {
  protected readonly deps: RuntimeDependencies<Env>;
  protected env: Env;

  /** Whether this runtime supports async node execution via waitForEvent */
  protected readonly supportsAsync: boolean = false;

  constructor(env: Env, dependencies: RuntimeDependencies<Env>) {
    this.env = env;
    this.deps = dependencies;
  }

  /**
   * Abstract method for executing a step with platform-specific durability.
   *
   * ## Contract for Implementations
   *
   * **Durability**: The step result should be persisted so that if the workflow
   * restarts, the step can be skipped and its cached result returned. This is
   * how Cloudflare Workflows achieves exactly-once semantics.
   *
   * **Serialization**: The return type T must be JSON-serializable. Cloudflare
   * Workflows persists step results to durable storage between executions.
   * Non-serializable values (functions, classes, circular refs) will fail.
   *
   * **Idempotency**: The provided function `fn` should be idempotent or
   * tolerate retries. Platform implementations may retry on transient failures.
   *
   * **Error Handling**: Errors thrown by `fn` should propagate to the caller.
   * Implementations may add retry logic for transient errors (network timeouts)
   * but should not swallow or transform application errors.
   *
   * @param name - Human-readable step identifier. Used for logging and the
   *               Cloudflare Workflows introspection API. Convention: lowercase
   *               with spaces (e.g., "run node abc123", "persist final state").
   * @param fn - Async function to execute. Must return JSON-serializable value.
   * @returns The result of fn, either fresh or from durable cache on replay.
   */
  protected abstract executeStep<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T>;

  /**
   * Abstract method for waiting on an external event (async node completion).
   *
   * ## Contract for Implementations
   *
   * **WorkflowRuntime**: Uses `step.waitForEvent()` to park the workflow with
   * zero compute cost until the event arrives (up to 365 days).
   *
   * **WorkerRuntime**: Throws — async nodes detect `asyncSupported: false` and
   * fall back to blocking mode, so this is never called.
   *
   * @param name - Human-readable step name for logging/introspection
   * @param eventType - The event type string to wait for
   * @param timeout - Duration string (e.g., "30 minutes")
   * @returns The event payload
   */
  protected abstract waitForNodeEvent<T>(
    name: string,
    eventType: string,
    timeout: string
  ): Promise<T>;

  /**
   * Suspends execution for the given duration with zero compute cost.
   * Used by multi-step nodes to sleep between polling intervals.
   *
   * **WorkflowRuntime**: Delegates to `step.sleep()` (durable, zero compute).
   * **WorkerRuntime**: Falls back to `setTimeout` (non-durable).
   */
  protected abstract executeSleep(
    name: string,
    durationMs: number
  ): Promise<void>;

  /**
   * Executes a function as a durable sub-step within a multi-step node.
   * The result is cached and replayed on workflow restart.
   *
   * **WorkflowRuntime**: Delegates to `step.do()` (durable, cached).
   * **WorkerRuntime**: Calls the function directly (no durability).
   */
  protected abstract executeSubStep<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T>;

  /**
   * The main entrypoint for workflow execution.
   *
   * Runs the lifecycle in order: prepare (validate + index the graph), check
   * credits, preload credentials, execute the graph, then — always, even when
   * the run failed or ran out of credits — settle usage and persist the record.
   *
   * Error handling strategy:
   * - Workflow-level errors (validation, cycles) → throw NonRetryableError
   * - Node execution failures → stored in nodeErrors, workflow continues
   * - Exceptions during node execution → caught, workflow status set to "error"
   * - All errors transmitted to client via monitoring service
   */
  async run(
    params: RuntimeParams,
    instanceId: string
  ): Promise<WorkflowExecution> {
    const { workflow, organizationId } = params;

    console.log(
      `[Runtime] run workflow=${workflow.id} trigger=${workflow.trigger} nodes=${workflow.nodes.length}`
    );

    let record: WorkflowExecution = {
      id: instanceId,
      workflowId: workflow.id,
      status: "submitted",
      nodeExecutions: [],
      startedAt: new Date(),
      endedAt: undefined,
    } as WorkflowExecution;

    await this.notify(record);

    // Provenance: which definition produced this execution.
    const definitionHash = await computeDefinitionHash(workflow);

    // Declared outside the try so the finally block can still settle and
    // persist when execution throws part-way through.
    let prepared: PreparedRun | undefined;
    let isExhausted = false;
    let caughtError = false;

    try {
      prepared = await this.prepare(params, instanceId);

      if (await this.hasCredits(params)) {
        await this.executeStep("preload organization resources", async () =>
          this.deps.credentialProvider.initialize(organizationId)
        );

        record = {
          ...record,
          status: getExecutionStatus(prepared.graph, prepared.state),
        };
        await this.notify(record);

        record = await this.executeGraph(prepared, record);
      } else {
        // Fall through to the finally block so the exhausted record is
        // persisted and the returned record matches what was stored.
        isExhausted = true;
        record = {
          ...record,
          status: "exhausted",
          error: "Insufficient compute credits",
        };
        await this.notify(record);
      }
    } catch (error) {
      caughtError = true;
      console.error(
        `[Runtime] Execution error: workflow=${workflow.id}`,
        error instanceof Error ? error.message : String(error)
      );
      record = {
        ...record,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
      await this.notify(record);
    } finally {
      record.endedAt = new Date();

      if (prepared) {
        await this.settleUsage(params, prepared.state, isExhausted);
        record = await this.persist(prepared, record, {
          params,
          instanceId,
          definitionHash,
          finalStatus: isExhausted
            ? "exhausted"
            : caughtError
              ? "error"
              : getExecutionStatus(prepared.graph, prepared.state),
        });
      }

      await this.notify(record);
    }

    return record;
  }

  /**
   * Validates the workflow and derives everything the run needs from it.
   *
   * Only the JSON-safe half goes through the durable step; the graph is rebuilt
   * on this side of it because Maps and Sets don't survive serialization.
   * Rebuilding is safe because indexing is a pure function of the workflow.
   */
  private async prepare(
    params: RuntimeParams,
    instanceId: string
  ): Promise<PreparedRun> {
    const { workflow, organizationId, userPlan, inputOverrides } = params;

    const { context, state } = await this.executeStep(
      "initialise workflow",
      async () => {
        const validationErrors = validateWorkflow(workflow);
        if (validationErrors.length > 0) {
          throw new NonRetryableError(
            `Workflow validation failed: ${validationErrors
              .map((e) => e.message)
              .join(", ")}`
          );
        }

        const context: WorkflowExecutionContext = {
          workflow,
          workflowId: workflow.id,
          organizationId,
          executionId: instanceId,
          // Carried on the context rather than on `this`, so concurrent runs
          // through one Runtime instance cannot see each other's trigger.
          trigger: extractTrigger(params),
          userPlan,
          inputOverrides,
        };

        const state: ExecutionState = {
          nodeInputs: {},
          nodeOutputs: {},
          executedNodes: [],
          skippedNodes: [],
          nodeErrors: {},
          nodeUsage: {},
        };

        return { context, state };
      }
    );

    // Validation above already rejects cycles, so indexing cannot fail here.
    return { context, graph: ExecutionGraph.build(workflow), state };
  }

  /**
   * Publishes a progress update, swallowing any failure.
   *
   * Monitoring is best-effort telemetry: it tells connected clients what is
   * happening, and nothing depends on it having arrived. Letting a broken
   * monitoring service abort the run would trade a cosmetic problem for a lost
   * execution record, so failures are logged and stepped over.
   */
  private async notify(record: WorkflowExecution): Promise<void> {
    try {
      await this.deps.monitoringService.sendUpdate(record);
    } catch (error) {
      console.error(
        `[Runtime] Failed to publish progress for execution=${record.id}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async hasCredits(params: RuntimeParams): Promise<boolean> {
    return this.deps.creditService.hasEnoughCredits({
      organizationId: params.organizationId,
      computeCredits: params.computeCredits,
      subscriptionStatus: params.subscriptionStatus,
      overageLimit: params.overageLimit,
      unlimitedUsage: params.unlimitedUsage,
    });
  }

  /**
   * Schedules and runs the graph, streaming progress as nodes settle.
   * Returns the final in-memory record; persistence happens separately.
   */
  private async executeGraph(
    prepared: PreparedRun,
    startingRecord: WorkflowExecution
  ): Promise<WorkflowExecution> {
    const { context, graph, state } = prepared;
    const executor = this.createNodeExecutor();
    let record = startingRecord;

    const reportErrors = (result: NodeExecutionResult): NodeExecutionResult => {
      if (result.status === "error") {
        console.error(
          `[Runtime] Node error: nodeId=${result.nodeId} type=${graph.node(result.nodeId)?.type} error=${result.error}`
        );
      }
      return result;
    };

    await executeDataflow(graph, state, {
      runNode: (nodeId) => {
        const node = graph.node(nodeId);
        const execute = () => executor.execute(context, graph, state, nodeId);
        // Multi-step nodes drive their own durability via context.sleep/doStep;
        // everything else gets wrapped in one durable step.
        const started =
          node && this.deps.nodeRegistry.isMultiStep(node.type)
            ? execute()
            : this.executeStep(`run node ${nodeId}`, execute);
        return started.then(reportErrors);
      },

      resolvePending: (pending) =>
        this.resolveAsyncNode(context, graph, pending).then(reportErrors),

      onProgress: async (pendingNodes) => {
        record = {
          ...record,
          status: getExecutionStatus(graph, state),
          nodeExecutions: buildNodeExecutions(
            graph,
            state,
            undefined,
            pendingNodes.size > 0
              ? new Map<string, PendingEvent>(pendingNodes)
              : undefined
          ),
        };
        await this.notify(record);
      },
    });

    return record;
  }

  private createNodeExecutor(): NodeExecutor<Env> {
    return new NodeExecutor(
      this.env,
      this.deps,
      {
        sleep: (name, durationMs) => this.executeSleep(name, durationMs),
        doStep: (name, fn) => this.executeSubStep(name, fn),
      },
      this.supportsAsync
    );
  }

  /**
   * Resolves a node parked on an external event, turning the event payload into
   * a normal result. Inputs collected before parking are carried forward so the
   * finished node reports them like any other.
   */
  private async resolveAsyncNode(
    context: WorkflowExecutionContext,
    graph: ExecutionGraph,
    pendingResult: Extract<NodeExecutionResult, { status: "pending" }>
  ): Promise<NodeExecutionResult> {
    const { nodeId, inputs } = pendingResult;

    try {
      const event = await this.waitForNodeEvent<{
        outputs: Record<string, unknown>;
        usage: number;
        error?: string;
      }>(`wait for ${nodeId}`, pendingResult.eventType, pendingResult.timeout);

      // The payload crosses a trust boundary — it is posted by a form, an agent
      // callback, or anything else holding the event token — so every field is
      // treated as optional regardless of what the type says.
      const usage = Number.isFinite(event.usage) ? event.usage : 0;

      if (event.error) {
        return { nodeId, status: "error", inputs, error: event.error, usage };
      }

      const node = graph.node(nodeId);
      if (!node) {
        return {
          nodeId,
          status: "error",
          inputs,
          error: `Node ${nodeId} not found in workflow`,
        };
      }

      return {
        nodeId,
        status: "completed",
        inputs,
        outputs: await nodeOutputsToApi(
          node,
          event.outputs ?? {},
          this.deps.objectStore,
          context.organizationId,
          context.executionId
        ),
        usage,
      };
    } catch (error) {
      return {
        nodeId,
        status: "error",
        inputs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Records what the run consumed and re-checks the organization's balance.
   *
   * Settling runs on every execution, including exhausted ones, so the cached
   * availability flag flips and non-interactive triggers stop retrying. Neither
   * step may fail the run: the work is already done and the record must persist.
   */
  private async settleUsage(
    params: RuntimeParams,
    state: ExecutionState,
    isExhausted: boolean
  ): Promise<void> {
    const {
      organizationId,
      computeCredits,
      subscriptionStatus,
      overageLimit,
      unlimitedUsage,
      workflow,
    } = params;

    // Defence in depth: usage values round-trip through JSON and originate in
    // node implementations, so a single bad entry must not poison the sum. An
    // arithmetic NaN here would silently drop billing for the whole run.
    const totalUsage = Object.values(state.nodeUsage).reduce(
      (sum, usage) => (Number.isFinite(usage) ? sum + usage : sum),
      0
    );

    if (!isExhausted && totalUsage > 0) {
      try {
        await this.executeStep("record compute usage", async () =>
          this.deps.creditService.recordUsage(organizationId, totalUsage)
        );
      } catch (error) {
        console.error(
          `[Runtime] Failed to record compute usage for workflow=${workflow.id}`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    try {
      await this.executeStep("settle credit availability", async () =>
        this.deps.creditService.settleAvailability({
          organizationId,
          computeCredits,
          subscriptionStatus,
          overageLimit,
          unlimitedUsage,
        })
      );
    } catch (error) {
      console.error(
        `[Runtime] Failed to settle credit availability for workflow=${workflow.id}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /** Writes the execution record. Wrapped in a step so it happens exactly once. */
  private async persist(
    prepared: PreparedRun,
    record: WorkflowExecution,
    meta: {
      params: RuntimeParams;
      instanceId: string;
      definitionHash: string;
      finalStatus: WorkflowExecutionStatus;
    }
  ): Promise<WorkflowExecution> {
    const { context, graph, state } = prepared;
    const { params, instanceId, definitionHash, finalStatus } = meta;

    const hasNodeErrors = Object.keys(state.nodeErrors).length > 0;

    return this.executeStep("persist final execution record", async () =>
      this.deps.executionStore.save({
        id: instanceId,
        workflowId: context.workflowId,
        workflowName: context.workflow.name,
        userId: params.userId,
        organizationId: params.organizationId,
        status: finalStatus,
        nodeExecutions: buildNodeExecutions(graph, state, finalStatus),
        error: hasNodeErrors ? "Workflow execution failed" : record.error,
        startedAt: record.startedAt,
        endedAt: record.endedAt,
        workflowDefinition: context.workflow,
        definitionHash,
        runtimeVersion: this.deps.runtimeVersion,
      })
    );
  }
}
