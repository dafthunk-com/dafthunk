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

import type { InputOverrides } from "@dafthunk/runtime";
import { calculateTokenUsage } from "@dafthunk/runtime/utils/usage";
import type {
  Brief,
  BriefAnswers,
  GenerationPhase,
  GenerationStatus,
  GeneratorClientMessage,
  GeneratorServerMessage,
  NodeType,
  Workflow,
  WorkflowExample,
  WorkflowExecution,
} from "@dafthunk/types";
import { GENERATOR_PROTOCOL_VERSION } from "@dafthunk/types";
import {
  buildSynthesisPrompt,
  renderBriefSentence,
  resolveDestination,
} from "@dafthunk/utils";
import { Agent } from "agents";
import { eq } from "drizzle-orm";
import type { Connection, ConnectionContext } from "partyserver";
import { generateBrief } from "../agents/workflow-generator/brief";
import {
  GENERATOR_MODELS,
  RUN_RETENTION_MS,
  RUN_STALL_TIMEOUT_MS,
} from "../agents/workflow-generator/config";
import { achievableDestinations } from "../agents/workflow-generator/destinations";
import { filterEligible } from "../agents/workflow-generator/eligibility";
import type { DisarmedInput } from "../agents/workflow-generator/hydrate";
import { createModelRouter } from "../agents/workflow-generator/model-router";
import type { OrgResources } from "../agents/workflow-generator/org-resources";
import { loadOrgResources } from "../agents/workflow-generator/org-resources";
import type {
  GenerateCall,
  TierUsage,
} from "../agents/workflow-generator/pipeline";
import { runGenerationPipeline } from "../agents/workflow-generator/pipeline";
import type { Bindings } from "../context";
import {
  createDatabase,
  getIntegrations,
  getOrganizationBillingInfo,
  resolveOrganizationBillingOptions,
  stampOnboardingStage,
} from "../db";
import { users } from "../db/schema";
import { CloudflareNodeRegistry } from "../runtime/cloudflare-node-registry";
import { availableIntegrationProviders } from "../services/integration-availability";
import type { WorkflowExecutorParameters } from "../services/workflow-executor";
import { WorkflowExecutor } from "../services/workflow-executor";
import { ExampleStore } from "../stores/example-store";
import { WorkflowStore } from "../stores/workflow-store";
import { isCreditExhausted } from "../utils/credits";

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
  /**
   * Resolver for a run parked on the outward-steps question.
   *
   * In memory only, and deliberately so: it is a continuation of a pipeline
   * that is itself in memory, so persisting it would buy nothing — if this
   * object is evicted the run is gone either way. The run's row is moved to
   * `awaiting` while it waits, which is what keeps the stall clock off it.
   */
  private pendingApproval?: (decision: {
    approved: boolean;
    reason?: string;
  }) => void;

  /** When this session first stored its workflow, so a re-save keeps the date. */
  private createdAt?: Date;

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
    // The conversation that produced a workflow, so a critique can continue it
    // rather than describe the workflow to a model that never saw it.
    this.storageSql.exec(`
      CREATE TABLE IF NOT EXISTS gen_turns (
        session_id TEXT NOT NULL,
        turn       INTEGER NOT NULL,
        system     TEXT NOT NULL,
        messages   TEXT NOT NULL,
        PRIMARY KEY (session_id, turn)
      )
    `);

    // Added after `gen_runs` shipped. There is no migration to write — sessions
    // are reclaimed an hour after they end — but a Durable Object that was
    // mid-flight across a deploy still holds the original table.
    for (const column of [
      `turn INTEGER NOT NULL DEFAULT 0`,
      `brief TEXT`,
      // The trigger bindings hydration blanked, so `arm` can restore them.
      `disarmed TEXT`,
    ]) {
      try {
        this.storageSql.exec(`ALTER TABLE gen_runs ADD COLUMN ${column}`);
      } catch {
        // Already present.
      }
    }

    this.schemaReady = true;
  }

  private currentRun(sessionId: string) {
    this.ensureSchema();
    const rows = this.storageSql
      .exec(
        `SELECT status, prompt, cancelled, updated_at, turn, brief, workflow_id, disarmed FROM gen_runs WHERE session_id = ?`,
        sessionId
      )
      .toArray() as Array<{
      status: string;
      prompt: string;
      cancelled: number;
      updated_at: number;
      turn: number;
      brief: string | null;
      workflow_id: string | null;
      disarmed: string | null;
    }>;
    return rows[0];
  }

  /**
   * Claims the session for a new turn, or refuses.
   *
   * A session used to hold exactly one run. It now holds a conversation — ask,
   * resolve, critique — so the question is no longer "has this run started" but
   * "is it this turn's move". Only `running` is exclusive: everything else is a
   * session sitting still, waiting for the person.
   *
   * Returns the turn number to work under, or undefined to ignore the message.
   */
  private claimTurn(
    sessionId: string,
    options: { prompt?: string; from: GenerationStatus[] }
  ): number | undefined {
    this.ensureSchema();
    const existing = this.currentRun(sessionId);

    if (!existing) {
      // A first turn can only be an opening move.
      if (!options.from.includes("idle")) return undefined;
      this.storageSql.exec(
        `INSERT INTO gen_runs (session_id, status, prompt, turn, updated_at) VALUES (?, 'running', ?, 0, ?)`,
        sessionId,
        options.prompt ?? "",
        Date.now()
      );
      return 0;
    }

    // The stall clock applies only to `running`. `awaiting` is a person
    // reading their request back to themselves, and three minutes of that is
    // not a hung run — timing it out would delete the session mid-thought.
    if (existing.status === "running") {
      const stalled = Date.now() - existing.updated_at > RUN_STALL_TIMEOUT_MS;
      if (!stalled) return undefined;

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
      return undefined;
    }

    if (!options.from.includes(existing.status as GenerationStatus)) {
      return undefined;
    }

    const turn = existing.turn + 1;
    // `cancelled` is sticky and polled cooperatively, so a cancel during one
    // turn would silently poison the next one if it were not cleared here.
    this.storageSql.exec(
      `UPDATE gen_runs SET status = 'running', cancelled = 0, turn = ?, prompt = ?, updated_at = ? WHERE session_id = ?`,
      turn,
      options.prompt ?? existing.prompt,
      Date.now(),
      sessionId
    );
    return turn;
  }

  private storeBrief(sessionId: string, brief: Brief | null): void {
    this.storageSql.exec(
      `UPDATE gen_runs SET status = 'awaiting', brief = ?, updated_at = ? WHERE session_id = ?`,
      brief ? JSON.stringify(brief) : null,
      Date.now(),
      sessionId
    );
    this.setState({ ...this.state, status: "awaiting" });
  }

  private storeConversation(
    sessionId: string,
    turn: number,
    system: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>
  ): void {
    // Only the opening request and the last draft are kept. A full conversation
    // holds several 4k-token JSON drafts, and a critique needs to see what was
    // built — not every step of how it got there.
    const trimmed = [
      ...messages.filter((message) => message.role === "user").slice(0, 1),
      ...messages.filter((message) => message.role === "assistant").slice(-1),
    ];

    this.storageSql.exec(
      `INSERT OR REPLACE INTO gen_turns (session_id, turn, system, messages) VALUES (?, ?, ?, ?)`,
      sessionId,
      turn,
      system,
      JSON.stringify(trimmed)
    );
  }

  private latestConversation(sessionId: string) {
    this.ensureSchema();
    const rows = this.storageSql
      .exec(
        `SELECT system, messages FROM gen_turns WHERE session_id = ? ORDER BY turn DESC LIMIT 1`,
        sessionId
      )
      .toArray() as Array<{ system: string; messages: string }>;
    if (!rows[0]) return undefined;

    return {
      system: rows[0].system,
      messages: JSON.parse(rows[0].messages) as Array<{
        role: "user" | "assistant";
        content: string;
      }>,
    };
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

  /**
   * Appends the frame to the log, then fans it out to every connection.
   *
   * The write is guarded because it is not the point of the run. SQLite
   * refuses a row past its size limit with SQLITE_TOOBIG, and an unguarded
   * `exec` turned that into a thrown generation — a workflow that had been
   * built, validated, saved and run successfully was reported to the user as
   * "Generation failed: string or blob too big". `previewExecution` keeps the
   * usual offender in bounds; this makes any remaining one cost a replay entry
   * rather than the whole session.
   */
  private emit(frame: GeneratorServerMessage): void {
    const payload = JSON.stringify(frame);
    const sessionId = this.state?.sessionId;

    if (sessionId) {
      this.ensureSchema();
      try {
        this.storageSql.exec(
          `INSERT INTO gen_frames (session_id, frame) VALUES (?, ?)`,
          sessionId,
          payload
        );
      } catch (error) {
        console.error(
          `[WorkflowGenerator] could not log a ${frame.type} frame (${payload.length} bytes):`,
          error
        );
        // Leave a marker rather than a hole. A client that reconnects has no
        // way to know a frame is missing, and a gap in the middle of a replay
        // reads as the run having stopped.
        this.logUnstorableFrame(sessionId, frame.type, payload.length);
      }
    }

    this.hiddenMethods.broadcast(payload);
  }

  /** Best-effort note that a frame was dropped from the replay log. */
  private logUnstorableFrame(
    sessionId: string,
    type: string,
    bytes: number
  ): void {
    const marker: GeneratorServerMessage = {
      type: "log",
      level: "warn",
      message: `A "${type}" update was too large to keep for replay (${bytes.toLocaleString()} bytes). It is on screen now, but will not survive a reload.`,
    };
    try {
      this.storageSql.exec(
        `INSERT INTO gen_frames (session_id, frame) VALUES (?, ?)`,
        sessionId,
        JSON.stringify(marker)
      );
    } catch {
      // Nothing further to try; the run continues either way.
    }
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
        protocol: GENERATOR_PROTOCOL_VERSION,
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
        const turn = this.claimTurn(sessionId, {
          prompt: parsed.prompt,
          from: ["idle"],
        });
        if (turn !== undefined) {
          this.setState({ ...this.state, status: "running" });
          this.durableCtx.waitUntil(
            this.runPipeline(sessionId, turn, { prompt: parsed.prompt })
          );
        }
        return;
      }
      case "ask": {
        // Allowed from any settled state: retyping after suggestions, or
        // starting over from a finished run, are both the same move.
        const turn = this.claimTurn(sessionId, {
          prompt: parsed.prompt,
          from: ["idle", "awaiting", "done", "failed"],
        });
        if (turn !== undefined) {
          this.setState({ ...this.state, status: "running" });
          this.durableCtx.waitUntil(
            this.runBrief(sessionId, turn, parsed.prompt)
          );
        }
        return;
      }
      case "resolve": {
        const stored = this.currentRun(sessionId);
        if (!stored?.brief) return;
        const brief = JSON.parse(stored.brief) as Brief;

        const turn = this.claimTurn(sessionId, { from: ["awaiting"] });
        if (turn !== undefined) {
          // The honest "they committed to what we understood" event, and the
          // only one of the funnel's stages that this flow alone can report.
          const userId = this.state?.userId;
          if (userId) {
            this.durableCtx.waitUntil(
              stampOnboardingStage(
                createDatabase(this.env.DB),
                userId,
                "briefResolved"
              ).catch((error) =>
                console.error("[WorkflowGenerator] stamp failed:", error)
              )
            );
          }
          this.setState({ ...this.state, status: "running" });
          this.durableCtx.waitUntil(
            this.runPipeline(sessionId, turn, {
              brief,
              answers: parsed.answers,
            })
          );
        }
        return;
      }
      case "critique": {
        const stored = this.currentRun(sessionId);
        const conversation = this.latestConversation(sessionId);
        // Nothing to correct without a workflow and the conversation that
        // built it — an older session whose storage predates `gen_turns`
        // simply cannot take a critique.
        if (!stored?.workflow_id || !conversation) return;

        const turn = this.claimTurn(sessionId, { from: ["done"] });
        if (turn !== undefined) {
          this.setState({ ...this.state, status: "running" });
          this.durableCtx.waitUntil(
            this.runPipeline(sessionId, turn, {
              resume: {
                ...conversation,
                note: parsed.note,
                workflowId: stored.workflow_id,
              },
            })
          );
        }
        return;
      }
      case "approve":
      case "decline": {
        const resolve = this.pendingApproval;
        this.pendingApproval = undefined;

        if (!resolve) {
          this.ensureSchema();
          const stored = this.currentRun(sessionId);

          // Parked, but the continuation is gone — this object restarted while
          // it waited. Both buttons would otherwise do nothing at all, and the
          // stall clock does not apply to `awaiting`, so the session would sit
          // there forever. Say so instead. Nothing was run, which is the one
          // reassurance actually worth giving here.
          if (stored?.status === "awaiting") {
            this.fail(sessionId, {
              type: "error",
              code: "STALLED",
              message:
                "This session expired while waiting, so nothing was sent or posted. Open the workflow to look at it, or start again.",
              recoverable: true,
            });
            return;
          }

          // Otherwise a duplicate click, or a message against a pipeline that
          // has already moved on. Ignoring is right — resolving twice would
          // run the workflow a second time.
          return;
        }

        this.ensureSchema();
        this.storageSql.exec(
          `UPDATE gen_runs SET status = 'running', updated_at = ? WHERE session_id = ?`,
          Date.now(),
          sessionId
        );
        this.setState({ ...this.state, status: "running" });

        resolve(
          parsed.type === "approve"
            ? { approved: true }
            : { approved: false, reason: parsed.reason }
        );
        return;
      }
      case "arm": {
        // No turn is claimed: arming spends no model call and moves no
        // conversation forward. It is only legal on a finished session with a
        // stored workflow and something actually disarmed — anything else is
        // a duplicate click or a stale client, and ignoring is right because
        // the restore is idempotent anyway.
        const stored = this.currentRun(sessionId);
        if (stored?.status !== "done" || !stored.workflow_id) return;
        if (!stored.disarmed) return;

        let disarmed: DisarmedInput[];
        try {
          disarmed = JSON.parse(stored.disarmed) as DisarmedInput[];
        } catch {
          return;
        }
        if (disarmed.length === 0) return;

        this.durableCtx.waitUntil(
          this.armWorkflow(stored.workflow_id, disarmed)
        );
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
        // Deliberately not a close. The dangerous direction is a client one
        // deploy ahead of this worker: closing its socket mid-run loses the
        // session, whereas ignoring the message leaves the run intact and the
        // client free to fall back. The reverse direction is already safe —
        // the client reducer ignores frames it does not know.
        console.warn(
          `[WorkflowGeneratorAgent] Ignoring unknown message type: ${
            (parsed as { type?: unknown }).type
          }`
        );
    }
  }

  // ── Pipeline ──────────────────────────────────────────────────────────

  /**
   * Everything both turns need before they can talk to a model.
   *
   * Emits the failure and returns undefined when the org cannot generate at
   * all, so callers only handle the happy path. Shared because the brief turn
   * has exactly the same preconditions as synthesis — it costs credits and
   * needs the same catalog to know which destinations are real.
   */
  private async prepare(sessionId: string) {
    const userId = this.state?.userId;
    const organizationId = this.state?.organizationId;
    if (!userId || !organizationId) return undefined;

    const db = createDatabase(this.env.DB);

    // Independent reads on the same key; from inside a DO each is a
    // cross-service hop, so overlapping them saves a round trip.
    //
    // Guarded here rather than by the callers: this runs under `waitUntil`, so
    // a throw that escapes is an unhandled rejection and the client is left
    // watching a run that will never speak again.
    let billingInfo: Awaited<ReturnType<typeof getOrganizationBillingInfo>>;
    let integrations: Awaited<ReturnType<typeof getIntegrations>>;
    try {
      [billingInfo, integrations] = await Promise.all([
        getOrganizationBillingInfo(db, organizationId),
        getIntegrations(db, organizationId),
      ]);
    } catch (error) {
      console.error("[WorkflowGenerator] pre-flight failed:", error);
      this.fail(sessionId, {
        type: "error",
        code: "INTERNAL",
        message: "Something broke on my end before it could start. Try again.",
        recoverable: true,
      });
      return undefined;
    }

    if (!billingInfo) {
      this.fail(sessionId, {
        type: "error",
        code: "INTERNAL",
        message: "Organization not found.",
        recoverable: false,
      });
      return undefined;
    }

    if (isCreditExhausted(billingInfo, this.env.CLOUDFLARE_ENV)) {
      this.fail(sessionId, {
        type: "error",
        code: "CREDITS_EXHAUSTED",
        message: "Not enough compute credits to generate a workflow.",
        recoverable: false,
      });
      return undefined;
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
      return undefined;
    }

    const registry = new CloudflareNodeRegistry(
      this.env,
      this.state?.developerMode ?? false
    );

    // The address `send-email` delivers to. Read here rather than at execution:
    // `NodeContext` carries no user identity, so the recipient has to be baked
    // into the graph while it is being built.
    let ownerEmail: string | undefined;
    try {
      const [row] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId));
      ownerEmail = row?.email ?? undefined;
    } catch (error) {
      // Not fatal: the generation can still produce an on-screen result. The
      // destination contract will simply have nothing to pin.
      console.error("[WorkflowGenerator] could not read owner email:", error);
    }

    // What the org owns, for node inputs that hold a resource id. Read here
    // for the same reason as the address above: the model is never shown these
    // ids, so the binding has to happen while the graph is being built.
    let orgResources: OrgResources = {};
    try {
      orgResources = await loadOrgResources(db, organizationId);
    } catch (error) {
      // Not fatal: an empty set simply withholds the nodes that need one,
      // which is the behaviour that shipped before any of this existed.
      console.error("[WorkflowGenerator] could not read org resources:", error);
    }

    return {
      userId,
      organizationId,
      billingInfo,
      ownerEmail,
      orgResources,
      nodeTypes: registry.getNodeTypes() as NodeType[],
      connectedProviders: new Set(
        integrations.map((integration) => integration.provider)
      ) as ReadonlySet<string>,
      availableProviders: new Set(
        availableIntegrationProviders(this.env)
      ) as ReadonlySet<string>,
    };
  }

  /**
   * Reads the request back, then stops and waits for the person.
   *
   * Everything structural is decided here rather than in the browser: which
   * destinations are real for this org, and therefore what the brief is even
   * allowed to offer.
   */
  private async runBrief(
    sessionId: string,
    turn: number,
    prompt: string
  ): Promise<void> {
    const context = await this.prepare(sessionId);
    if (!context) return;

    try {
      this.emit({
        type: "phase",
        phase: "briefing",
        label: "Reading that back",
      });
      this.touch(sessionId);

      const { eligible } = filterEligible(context.nodeTypes, {
        connectedProviders: context.connectedProviders,
      });

      const outcome = await generateBrief({
        request: prompt,
        // The trigger is not known until the brief picks one, so responder
        // destinations are resolved later, on `resolve`.
        destinations: achievableDestinations({
          eligible,
          trigger: "manual",
          availableProviders: context.availableProviders,
          nodeTypes: context.nodeTypes,
          connectedProviders: context.connectedProviders,
        }),
        connectedProviders: context.connectedProviders,
        callLLM: (call: GenerateCall) => this.callModel(call),
      });

      this.logUsage(sessionId, context.organizationId, "brief", {
        fast: outcome.usage,
        synthesis: { inputTokens: 0, outputTokens: 0 },
      });

      // Our end broke. Say so, and keep it recoverable — the request was fine
      // and retyping it is not what needs to happen. The diagnostic goes to
      // the log: the moment something breaks is exactly when the voice has to
      // hold, and "(segments=string(1200), keys=0,1,2)" is not a sentence.
      if (outcome.kind === "failed") {
        console.error(
          `[WorkflowGenerator] brief failed: ${outcome.message} (session=${sessionId})`
        );
        this.fail(sessionId, {
          type: "error",
          code: "INTERNAL",
          message:
            "Something went wrong on my end reading that back. Your request was fine — try again.",
          recoverable: true,
        });
        return;
      }

      if (outcome.kind === "suggestions") {
        this.emit({
          type: "suggestions",
          turn,
          prompts: outcome.prompts,
          matched: outcome.matched,
        });
        this.storeBrief(sessionId, null);
        return;
      }

      this.emit({ type: "brief", turn, brief: outcome.brief });
      this.storeBrief(sessionId, outcome.brief);
    } catch (error) {
      console.error("[WorkflowGenerator] brief crashed:", error);
      this.fail(sessionId, {
        type: "error",
        code: "INTERNAL",
        message:
          "Something went wrong on my end reading that back. Your request was fine — try again.",
        recoverable: true,
      });
    }
  }

  private logUsage(
    sessionId: string,
    organizationId: string,
    stage: string,
    usage: TierUsage
  ): void {
    // Measured, not charged: generation is free while the feature is gated,
    // but the number is what will set GA pricing. Priced per tier — the two
    // are an order of magnitude apart, so summing the tokens first and
    // applying one rate would misprice every mixed run.
    const credits = (Object.keys(usage) as Array<keyof TierUsage>).reduce(
      (total, tier) =>
        total +
        calculateTokenUsage(
          usage[tier].inputTokens,
          usage[tier].outputTokens,
          GENERATOR_MODELS[tier].pricing
        ),
      0
    );
    console.log(
      `[WorkflowGenerator] session=${sessionId} org=${organizationId} stage=${stage} fast=${usage.fast.inputTokens}/${usage.fast.outputTokens} synthesis=${usage.synthesis.inputTokens}/${usage.synthesis.outputTokens} credits=${credits}`
    );
  }

  /**
   * Builds, saves and runs — from a raw prompt, an accepted brief, or a
   * critique of what was already built.
   */
  private async runPipeline(
    sessionId: string,
    turn: number,
    input: {
      prompt?: string;
      brief?: Brief;
      answers?: BriefAnswers;
      resume?: {
        system: string;
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        note: string;
        workflowId: string;
      };
    }
  ): Promise<void> {
    const context = await this.prepare(sessionId);
    if (!context) return;

    const { userId, organizationId, billingInfo } = context;

    try {
      // What the model is asked to build. A brief resolves to a sentence plus
      // an explicit destination; a raw prompt is its own instruction.
      const answers = input.answers ?? {};
      const prompt = input.brief
        ? buildSynthesisPrompt(input.brief, answers)
        : (input.prompt ?? "");

      const destination = input.brief
        ? resolveDestination(input.brief, answers)
        : undefined;

      // The brief may be minutes old and the user may have gone off to link an
      // account in the meantime — so the connection is checked now, against
      // what is true now, rather than trusted from when the sentence was
      // written. Building on a stale answer would produce a workflow whose
      // delivery node fails the moment it runs.
      if (
        destination?.requiresConnection &&
        destination.provider &&
        !context.connectedProviders.has(destination.provider)
      ) {
        this.storeBrief(sessionId, input.brief ?? null);
        this.emit({
          type: "error",
          code: "NEEDS_CONNECTION",
          message: `Connect ${destination.provider} first — the workflow cannot ${destination.label} without it.`,
          recoverable: true,
        });
        return;
      }

      if (input.brief) {
        this.emit({
          type: "resolved",
          turn,
          sentence: renderBriefSentence(input.brief, answers),
        });
      }

      const result = await runGenerationPipeline({
        prompt,
        destination,
        resume: input.resume,
        earlyPlan: true,
        onConversation: (system, messages) =>
          this.storeConversation(sessionId, turn, system, messages),
        nodeTypes: context.nodeTypes,
        connectedProviders: context.connectedProviders,
        orgResources: context.orgResources,
        ownerEmail: context.ownerEmail,
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
        requestApproval: (actions) => {
          this.emit({ type: "approval_required", actions });
          // Parked, not polled. The row goes to `awaiting` so the stall clock
          // — which exists for hung model calls — does not fail a run that is
          // simply waiting for a person to read it.
          this.storageSql.exec(
            `UPDATE gen_runs SET status = 'awaiting', updated_at = ? WHERE session_id = ?`,
            Date.now(),
            sessionId
          );
          this.setState({ ...this.state, status: "awaiting" });
          return new Promise((resolve) => {
            this.pendingApproval = resolve;
          });
        },
        callLLM: (call: GenerateCall) => this.callModel(call),
        save: (workflow, examples, workflowId) =>
          this.saveWorkflow(
            workflow,
            examples,
            userId,
            organizationId,
            workflowId
          ),
        run: (workflow, workflowId, parameters, inputOverrides) =>
          this.runOnce(
            workflow,
            workflowId,
            userId,
            organizationId,
            billingInfo,
            parameters,
            inputOverrides
          ),
      });

      this.logUsage(
        sessionId,
        organizationId,
        `build:${result.outcome}`,
        result.usage
      );

      this.storageSql.exec(
        `UPDATE gen_runs SET status = ?, workflow_id = ?, execution_id = ?, disarmed = ?, updated_at = ? WHERE session_id = ?`,
        result.outcome === "failed" ? "failed" : "done",
        result.workflowId ?? null,
        result.executionId ?? null,
        result.disarmed && result.disarmed.length > 0
          ? JSON.stringify(result.disarmed)
          : null,
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
      console.error("[WorkflowGenerator] pipeline crashed:", error);
      this.fail(sessionId, {
        type: "error",
        code: "INTERNAL",
        message:
          "Something broke on my end while building that. Your request was fine — try again.",
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
    // Cleanup was scheduled when a turn finished, but a session is no longer
    // over just because a run is: a critique moves it back to `running`, and
    // `awaiting` is someone still reading. Deleting under either would take
    // the session out from under a live user.
    const status = this.state?.sessionId
      ? this.currentRun(this.state.sessionId)?.status
      : undefined;

    if (status === "running" || status === "awaiting") {
      await this.scheduleCleanup();
      return;
    }

    await this.durableCtx.storage.deleteAll();
  }

  /**
   * The shipping dispatch path, shared with both harnesses.
   *
   * Never overridden here: a model sweep is an experiment, and a deployment
   * serving one is a deployment nobody chose.
   */
  private async callModel(call: GenerateCall) {
    return createModelRouter(this.env)(call);
  }

  /**
   * Restores the trigger bindings hydration blanked, making the workflow live.
   *
   * The values go back exactly as they were captured, through the same save
   * path every other write takes — `syncTriggers` then registers the trigger
   * with `active: true`, which is the arming. Idempotent: restoring an input
   * that already holds the value writes the same workflow again.
   */
  private async armWorkflow(
    workflowId: string,
    disarmed: DisarmedInput[]
  ): Promise<void> {
    const organizationId = this.state?.organizationId;
    if (!organizationId) return;

    try {
      const store = new WorkflowStore(this.env);
      const stored = await store.getWithData(workflowId, organizationId);
      if (!stored) {
        this.emit({
          type: "log",
          level: "warn",
          message:
            "I couldn't find the workflow to turn it on — it may have been deleted.",
          important: true,
        });
        return;
      }

      const byNode = new Map<string, DisarmedInput[]>();
      for (const entry of disarmed) {
        const list = byNode.get(entry.nodeId) ?? [];
        list.push(entry);
        byNode.set(entry.nodeId, list);
      }

      const nodes = stored.data.nodes.map((node) => {
        const restores = byNode.get(node.id);
        if (!restores) return node;
        return {
          ...node,
          inputs: node.inputs.map((input) => {
            const restore = restores.find(
              (entry) => entry.inputName === input.name
            );
            return restore ? { ...input, value: restore.value } : input;
          }),
        };
      });

      await store.save({
        id: workflowId,
        name: stored.name,
        description: stored.data.description,
        trigger: stored.data.trigger,
        runtime: stored.data.runtime ?? "workflow",
        organizationId,
        nodes,
        edges: stored.data.edges,
        apiHost: this.state?.apiHost,
        createdAt: stored.createdAt,
      });

      this.emit({ type: "armed", workflowId });
    } catch (error) {
      console.error("[WorkflowGenerator] arm failed:", error);
      this.emit({
        type: "log",
        level: "warn",
        message:
          "I couldn't turn it on from here. Open the workflow and enable it there.",
        important: true,
      });
    }
  }

  /**
   * Persists the graph and its examples.
   *
   * `existingId` makes this an update, which is how a repaired run replaces what
   * it already stored. `createdAt` is pinned to the first save because the D1
   * write is an upsert that would otherwise stamp the row as newly created every
   * time the generator corrects itself.
   */
  private async saveWorkflow(
    workflow: Workflow,
    examples: WorkflowExample[],
    userId: string,
    organizationId: string,
    existingId?: string
  ): Promise<string> {
    const workflowId = existingId ?? crypto.randomUUID();
    const store = new WorkflowStore(this.env);

    if (!existingId) this.createdAt = new Date();

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
      ...(this.createdAt && { createdAt: this.createdAt }),
    });

    // The test inputs the model wrote are saved beside the graph, so the user
    // can edit and re-run them without touching it. Best-effort: a generated
    // workflow that saved but has no examples is still usable.
    try {
      await new ExampleStore(this.env).save(workflowId, examples);
    } catch (error) {
      console.error("Failed to save the generated examples:", error);
    }

    // Only on first save: the stage records that a workflow was created, and a
    // repair round does not create a second one.
    if (!existingId) {
      const db = createDatabase(this.env.DB);
      try {
        await stampOnboardingStage(db, userId, "workflowCreated");
      } catch (error) {
        console.error("Failed to stamp workflowCreated:", error);
      }
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
    parameters: WorkflowExecutorParameters,
    inputOverrides?: InputOverrides
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
      ...resolveOrganizationBillingOptions(billingInfo),
      parameters,
      ...(inputOverrides && { inputOverrides }),
      env: this.env,
    });

    return execution;
  }
}
