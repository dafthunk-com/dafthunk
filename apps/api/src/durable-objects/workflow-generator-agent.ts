/**
 * WorkflowGeneratorAgent Durable Object
 *
 * Turns a natural-language description into a saved, executed workflow, and
 * streams progress to the browser over a WebSocket.
 *
 * ## Shape
 *
 * A thin shell. All the logic lives in `runGenerationPipeline`, which takes its
 * network dependencies as callbacks — the DO just supplies real ones. That is
 * what lets the whole generate/repair/save/run flow be unit-tested without a
 * Cloudflare environment.
 *
 * ## Hibernation safety
 *
 * Every frame is appended to `gen_frames` before being broadcast, and replayed
 * in sequence on connect. One mechanism covers hibernation, reconnects, late
 * subscription and "closed the tab and came back" — a reconnecting client
 * catches up rather than restarting the run.
 *
 * Keyed by a client-generated session id, not a workflow id: the workflow does
 * not exist until the save phase.
 */

import { calculateTokenUsage } from "@dafthunk/runtime/utils/usage";
import type {
  GenerationPhase,
  GenerationStatus,
  GeneratorClientMessage,
  GeneratorServerMessage,
  NodeType,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import { Agent } from "agents";
import type { Connection, ConnectionContext } from "partyserver";

import {
  GENERATOR_MODEL,
  GENERATOR_PRICING,
  GENERATOR_PROVIDER,
  RUN_RETENTION_MS,
  RUN_STALL_TIMEOUT_MS,
} from "../agents/workflow-generator/config";
import type { GenerateCall } from "../agents/workflow-generator/pipeline";
import { runGenerationPipeline } from "../agents/workflow-generator/pipeline";
import { DRAFT_SCHEMA } from "../agents/workflow-generator/prompts";
import type { Bindings } from "../context";
import {
  createDatabase,
  getIntegrations,
  getOrganizationBillingInfo,
  resolveOrganizationBillingOptions,
  resolveOrganizationPlan,
  stampOnboardingStage,
} from "../db";
import { CloudflareNodeRegistry } from "../runtime/cloudflare-node-registry";
import type { WorkflowExecutorParameters } from "../services/workflow-executor";
import { WorkflowExecutor } from "../services/workflow-executor";
import { ExampleStore } from "../stores/example-store";
import { WorkflowStore } from "../stores/workflow-store";
import { isCreditExhausted } from "../utils/credits";
import { extractNodeValues } from "../utils/example-inputs";
import { callAgentLLM } from "./agent-llm";

// ── Agent SDK type shim ──────────────────────────────────────────────────
// The agents bundled d.ts doesn't resolve some inherited Agent/Server methods
// due to transitive partyserver type resolution issues. The methods exist at
// runtime; the cast is contained here rather than scattered across call sites.

interface HiddenAgentMethods {
  broadcast(msg: string, without?: string[]): void;
}

interface WorkflowGeneratorState {
  sessionId?: string;
  userId?: string;
  organizationId?: string;
  apiHost?: string;
  developerMode?: boolean;
  status?: GenerationStatus;
  phase?: GenerationPhase;
  workflowId?: string;
  executionId?: string;
}

export class WorkflowGeneratorAgent extends Agent<
  Bindings,
  WorkflowGeneratorState
> {
  initialState: WorkflowGeneratorState = {};

  private schemaReady = false;

  private get hiddenMethods(): HiddenAgentMethods {
    return this as unknown as HiddenAgentMethods;
  }

  private get durableCtx(): DurableObjectState {
    return (this as unknown as { ctx: DurableObjectState }).ctx;
  }

  private get storageSql(): SqlStorage {
    return this.durableCtx.storage.sql;
  }

  shouldSendProtocolMessages(
    _connection: Connection,
    _ctx: ConnectionContext
  ): boolean {
    return false;
  }

  // ── Storage ───────────────────────────────────────────────────────────

  private ensureSchema(): void {
    if (this.schemaReady) return;
    this.storageSql.exec(`
      CREATE TABLE IF NOT EXISTS gen_runs (
        session_id   TEXT PRIMARY KEY,
        status       TEXT NOT NULL,
        prompt       TEXT NOT NULL,
        workflow_id  TEXT,
        execution_id TEXT,
        error        TEXT,
        cancelled    INTEGER NOT NULL DEFAULT 0,
        updated_at   INTEGER NOT NULL
      )
    `);
    this.storageSql.exec(`
      CREATE TABLE IF NOT EXISTS gen_frames (
        seq        INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        frame      TEXT NOT NULL
      )
    `);
    this.schemaReady = true;
  }

  private currentRun(sessionId: string) {
    this.ensureSchema();
    const rows = this.storageSql
      .exec(
        `SELECT status, prompt, cancelled, updated_at FROM gen_runs WHERE session_id = ?`,
        sessionId
      )
      .toArray() as Array<{
      status: string;
      prompt: string;
      cancelled: number;
      updated_at: number;
    }>;
    return rows[0];
  }

  /**
   * Claims the run for this session. Returns false when one already exists, in
   * which case the caller replays frames instead of generating again.
   */
  private claimRun(sessionId: string, prompt: string): boolean {
    this.ensureSchema();
    const existing = this.currentRun(sessionId);

    if (existing) {
      const stalled =
        existing.status === "running" &&
        Date.now() - existing.updated_at > RUN_STALL_TIMEOUT_MS;
      if (!stalled) return false;

      // A half-finished LLM call cannot be resumed, so fail it loudly rather
      // than leaving the client watching a run that will never speak again.
      this.storageSql.exec(
        `UPDATE gen_runs SET status = 'failed', error = 'stalled', updated_at = ? WHERE session_id = ?`,
        Date.now(),
        sessionId
      );
      this.emit({
        type: "error",
        code: "STALLED",
        message: "The previous attempt stopped responding. Try again.",
        recoverable: true,
      });
      return false;
    }

    this.storageSql.exec(
      `INSERT INTO gen_runs (session_id, status, prompt, updated_at) VALUES (?, 'running', ?, ?)`,
      sessionId,
      prompt,
      Date.now()
    );
    return true;
  }

  private touch(sessionId: string): void {
    this.storageSql.exec(
      `UPDATE gen_runs SET updated_at = ? WHERE session_id = ?`,
      Date.now(),
      sessionId
    );
  }

  private isCancelled(sessionId: string): boolean {
    return (this.currentRun(sessionId)?.cancelled ?? 0) === 1;
  }

  /** Appends the frame to the log, then fans it out to every connection. */
  private emit(frame: GeneratorServerMessage): void {
    const sessionId = this.state?.sessionId;
    if (sessionId) {
      this.ensureSchema();
      this.storageSql.exec(
        `INSERT INTO gen_frames (session_id, frame) VALUES (?, ?)`,
        sessionId,
        JSON.stringify(frame)
      );
    }
    this.hiddenMethods.broadcast(JSON.stringify(frame));
  }

  private replayFrames(connection: Connection, sessionId: string): void {
    this.ensureSchema();
    const rows = this.storageSql
      .exec(
        `SELECT frame FROM gen_frames WHERE session_id = ? ORDER BY seq ASC`,
        sessionId
      )
      .toArray() as Array<{ frame: string }>;
    for (const row of rows) connection.send(row.frame);
  }

  // ── WebSocket lifecycle ───────────────────────────────────────────────

  async onConnect(
    connection: Connection,
    ctx: ConnectionContext
  ): Promise<void> {
    const userId = ctx.request.headers.get("X-User-Id") || "";
    const organizationId = ctx.request.headers.get("X-Organization-Id") || "";
    const developerMode =
      ctx.request.headers.get("X-Developer-Mode") === "true";
    const sessionId =
      ctx.request.headers.get("x-partykit-room") ||
      new URL(ctx.request.url).pathname.split("/").pop() ||
      "";

    if (!sessionId || !userId || !organizationId) {
      connection.close(1008, "Missing session, user or organization");
      return;
    }

    this.setState({
      ...this.state,
      sessionId,
      userId,
      organizationId,
      developerMode,
      apiHost: new URL(ctx.request.url).origin,
      status: this.state?.status ?? "idle",
    });

    const run = this.currentRun(sessionId);
    connection.send(
      JSON.stringify({
        type: "session",
        sessionId,
        status: (run?.status as GenerationStatus) ?? "idle",
        phase: this.state?.phase,
        prompt: run?.prompt,
      } satisfies GeneratorServerMessage)
    );

    this.replayFrames(connection, sessionId);
  }

  async onMessage(
    connection: Connection,
    message: string | ArrayBuffer
  ): Promise<void> {
    if (typeof message !== "string") {
      connection.close(1003, "Binary messages are not supported");
      return;
    }

    let parsed: GeneratorClientMessage;
    try {
      parsed = JSON.parse(message) as GeneratorClientMessage;
    } catch {
      connection.close(1003, "Malformed message");
      return;
    }

    const sessionId = this.state?.sessionId;
    if (!sessionId) {
      connection.close(1011, "Session not initialized");
      return;
    }

    switch (parsed.type) {
      case "start": {
        // Claim first so a duplicate start is ignored rather than regenerating,
        // and return immediately so `cancel` can still be received. A duplicate
        // needs no replay here — onConnect already sent this connection the
        // whole log, and replaying again would double every frame it has.
        if (this.claimRun(sessionId, parsed.prompt)) {
          this.setState({ ...this.state, status: "running" });
          this.durableCtx.waitUntil(this.runPipeline(sessionId, parsed.prompt));
        }
        return;
      }
      case "cancel": {
        this.ensureSchema();
        this.storageSql.exec(
          `UPDATE gen_runs SET cancelled = 1, updated_at = ? WHERE session_id = ?`,
          Date.now(),
          sessionId
        );
        return;
      }
      default:
        connection.close(1003, "Unknown message type");
    }
  }

  // ── Pipeline ──────────────────────────────────────────────────────────

  private async runPipeline(sessionId: string, prompt: string): Promise<void> {
    const userId = this.state?.userId;
    const organizationId = this.state?.organizationId;
    if (!userId || !organizationId) return;

    const db = createDatabase(this.env.DB);

    try {
      // Independent reads on the same key; from inside a DO each is a
      // cross-service hop, so overlapping them saves a round trip.
      const [billingInfo, integrations] = await Promise.all([
        getOrganizationBillingInfo(db, organizationId),
        getIntegrations(db, organizationId),
      ]);

      if (!billingInfo) {
        this.fail(sessionId, {
          type: "error",
          code: "INTERNAL",
          message: "Organization not found.",
          recoverable: false,
        });
        return;
      }

      if (isCreditExhausted(billingInfo, this.env.CLOUDFLARE_ENV)) {
        this.fail(sessionId, {
          type: "error",
          code: "CREDITS_EXHAUSTED",
          message: "Not enough compute credits to generate a workflow.",
          recoverable: false,
        });
        return;
      }

      // The AI Gateway helpers silently degrade to an unusable client when any
      // of these is missing, producing a confusing 404 deep in the SDK.
      if (
        !this.env.CLOUDFLARE_ACCOUNT_ID ||
        !this.env.CLOUDFLARE_AI_GATEWAY_ID ||
        !this.env.CLOUDFLARE_API_TOKEN
      ) {
        this.fail(sessionId, {
          type: "error",
          code: "MISCONFIGURED",
          message:
            "Workflow generation is not configured on this deployment (missing AI Gateway settings).",
          recoverable: false,
        });
        return;
      }

      const registry = new CloudflareNodeRegistry(
        this.env,
        this.state?.developerMode ?? false
      );
      const nodeTypes: NodeType[] = registry.getNodeTypes();

      const connectedProviders = new Set(
        integrations.map((integration) => integration.provider)
      );

      // Resolved the same way the runtime's subscription gate resolves it, env
      // included, so the catalog offered never contains a node the executor
      // would then refuse. Note this returns "pro" outside production, so the
      // benchmark has to pin the plan rather than derive it.
      const plan =
        resolveOrganizationPlan(billingInfo, this.env.CLOUDFLARE_ENV) === "pro"
          ? "pro"
          : "trial";

      const result = await runGenerationPipeline({
        prompt,
        nodeTypes,
        plan,
        connectedProviders,
        apiHost: this.state?.apiHost,
        isCancelled: () => this.isCancelled(sessionId),
        emit: (frame) => {
          // Only phase frames advance the stall clock. Touching on every frame
          // doubled the storage writes per run to keep a timestamp that is only
          // ever compared against a three-minute threshold.
          if (frame.type === "phase") {
            this.setState({ ...this.state, phase: frame.phase });
            this.touch(sessionId);
          }
          this.emit(frame);
        },
        callLLM: (call: GenerateCall) => this.callModel(call),
        save: (workflow, sample) =>
          this.saveWorkflow(workflow, sample, userId, organizationId),
        run: (workflow, workflowId, parameters) =>
          this.runOnce(
            workflow,
            workflowId,
            userId,
            organizationId,
            billingInfo,
            parameters
          ),
      });

      // Measured, not charged: generation is free while the feature is gated,
      // but the number is what will set GA pricing.
      const credits = calculateTokenUsage(
        result.inputTokens,
        result.outputTokens,
        GENERATOR_PRICING
      );
      console.log(
        `[WorkflowGenerator] session=${sessionId} org=${organizationId} outcome=${result.outcome} in=${result.inputTokens} out=${result.outputTokens} credits=${credits}`
      );

      this.storageSql.exec(
        `UPDATE gen_runs SET status = ?, workflow_id = ?, execution_id = ?, updated_at = ? WHERE session_id = ?`,
        result.outcome === "failed" ? "failed" : "done",
        result.workflowId ?? null,
        result.executionId ?? null,
        Date.now(),
        sessionId
      );

      this.setState({
        ...this.state,
        status: result.outcome === "failed" ? "failed" : "done",
        workflowId: result.workflowId,
        executionId: result.executionId,
      });

      await this.scheduleCleanup();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[WorkflowGenerator] pipeline crashed:", error);
      this.fail(sessionId, {
        type: "error",
        code: "INTERNAL",
        message: `Generation failed: ${message}`,
        recoverable: true,
      });
    }
  }

  private fail(sessionId: string, frame: GeneratorServerMessage): void {
    this.ensureSchema();
    this.storageSql.exec(
      `UPDATE gen_runs SET status = 'failed', updated_at = ? WHERE session_id = ?`,
      Date.now(),
      sessionId
    );
    this.setState({ ...this.state, status: "failed" });
    this.emit(frame);
    void this.scheduleCleanup();
  }

  /**
   * Frees the session's storage an hour after the run ends.
   *
   * Sessions are single-use and the id is minted fresh per attempt, so without
   * this every generation would leave a Durable Object holding its frame log —
   * including a full serialized graph per repair round — forever. An hour is
   * long enough for a reconnect to still replay.
   */
  private async scheduleCleanup(): Promise<void> {
    try {
      await this.durableCtx.storage.setAlarm(Date.now() + RUN_RETENTION_MS);
    } catch (error) {
      console.error("[WorkflowGenerator] failed to schedule cleanup:", error);
    }
  }

  async alarm(): Promise<void> {
    await this.durableCtx.storage.deleteAll();
  }

  private async callModel(call: GenerateCall) {
    const response = await callAgentLLM(this.env, {
      provider: GENERATOR_PROVIDER,
      model: GENERATOR_MODEL,
      instructions: call.system,
      messages: call.messages,
      tools: [],
      schema: DRAFT_SCHEMA as unknown as Record<string, unknown>,
    });

    return {
      content: response.content ?? "",
      inputTokens: response.inputTokens ?? 0,
      outputTokens: response.outputTokens ?? 0,
    };
  }

  private async saveWorkflow(
    workflow: Workflow,
    sample: { trigger?: Record<string, unknown> },
    userId: string,
    organizationId: string
  ): Promise<string> {
    const workflowId = crypto.randomUUID();
    const store = new WorkflowStore(this.env);

    await store.save({
      id: workflowId,
      name: workflow.name || "Generated Workflow",
      description: workflow.description,
      trigger: workflow.trigger,
      runtime: "workflow",
      organizationId,
      nodes: workflow.nodes,
      edges: workflow.edges,
      apiHost: this.state?.apiHost,
    });

    // The values the model chose are also saved as an example, so the user can
    // edit and re-run them without touching the graph. Best-effort: a generated
    // workflow that saved but has no example is still usable.
    try {
      const now = new Date();
      await new ExampleStore(this.env).save(workflowId, [
        {
          id: crypto.randomUUID(),
          name: "Generated sample",
          description:
            "Input values produced when this workflow was generated.",
          isDefault: true,
          nodeValues: extractNodeValues(workflow),
          trigger: sample.trigger,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    } catch (error) {
      console.error("Failed to save the generated example:", error);
    }

    const db = createDatabase(this.env.DB);
    try {
      await stampOnboardingStage(db, userId, "workflowCreated");
    } catch (error) {
      console.error("Failed to stamp workflowCreated:", error);
    }

    return workflowId;
  }

  /**
   * Runs the generated workflow once, synchronously.
   *
   * `runtime: "worker"` is deliberate and differs from what was saved: it
   * returns the finished execution inline (no polling, no second socket) and
   * stamps `workflowExecutedOk` itself. The cost is a 30s ceiling, which the
   * caller surfaces as a partial result rather than a failure.
   */
  private async runOnce(
    workflow: Workflow,
    workflowId: string,
    userId: string,
    organizationId: string,
    billingInfo: NonNullable<
      Awaited<ReturnType<typeof getOrganizationBillingInfo>>
    >,
    parameters: WorkflowExecutorParameters
  ): Promise<WorkflowExecution> {
    const { execution } = await WorkflowExecutor.execute({
      workflow: {
        id: workflowId,
        name: workflow.name,
        trigger: workflow.trigger,
        runtime: "worker",
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
      userId,
      organizationId,
      ...resolveOrganizationBillingOptions(
        billingInfo,
        this.env.CLOUDFLARE_ENV
      ),
      parameters,
      env: this.env,
    });

    return execution;
  }
}
