/**
 * GenerationSession — the AI workflow generator, hosted inside WorkflowAgent.
 *
 * Turns a natural-language description into a saved, executed workflow, and
 * streams progress to the browser over a WebSocket.
 *
 * ## Shape
 *
 * A thin shell. All the logic lives in `runGenerationPipeline`, which takes its
 * network dependencies as callbacks — this module just supplies real ones. That
 * is what lets the whole generate/repair/save/run flow be unit-tested without a
 * Cloudflare environment.
 *
 * The module holds the conversation; the host owns the Durable Object. The
 * `GenerationHost` seam is deliberately narrow: raw SQL storage for the
 * session tables, a broadcast that reaches only generation-tagged connections,
 * and — crucially — `saveWorkflowRecord`, through which every workflow write
 * goes so the host can reconcile any open editor session with what generation
 * just saved. Generation must never write a workflow to D1/R2 on its own.
 *
 * ## Hibernation safety
 *
 * Every frame is appended to `gen_frames` before being broadcast, and replayed
 * in sequence on connect. One mechanism covers hibernation, reconnects, late
 * subscription and "closed the tab and came back" — a reconnecting client
 * catches up rather than restarting the run.
 *
 * ## Identity
 *
 * The Durable Object is keyed by the workflow id, and the client mints it: the
 * id a brief session opens with is the id the workflow is saved under. The
 * `session_id` columns below always hold that same id — kept under their
 * original name so the schema needs no migration.
 */

import type { InputOverrides } from "@dafthunk/runtime";
import { calculateTokenUsage } from "@dafthunk/runtime/utils/usage";
import type {
  Brief,
  BriefAnswers,
  CloudflareModelInfo,
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
  resolveResourceBindings,
} from "@dafthunk/utils";
import { eq } from "drizzle-orm";
import type { Connection, ConnectionContext } from "partyserver";
import { workflowToDraft } from "../../agents/workflow-generator/adopt";
import { generateBrief } from "../../agents/workflow-generator/brief";
import {
  GENERATOR_MODELS,
  RUN_STALL_TIMEOUT_MS,
} from "../../agents/workflow-generator/config";
import { achievableDestinations } from "../../agents/workflow-generator/destinations";
import { filterEligible } from "../../agents/workflow-generator/eligibility";
import { buildGroundingContext } from "../../agents/workflow-generator/grounding";
import type { DisarmedInput } from "../../agents/workflow-generator/hydrate";
import { createModelRouter } from "../../agents/workflow-generator/model-router";
import type { OrgResources } from "../../agents/workflow-generator/org-resources";
import {
  loadOrgResources,
  offerableResources,
} from "../../agents/workflow-generator/org-resources";
import type {
  GenerateCall,
  TierUsage,
} from "../../agents/workflow-generator/pipeline";
import { runGenerationPipeline } from "../../agents/workflow-generator/pipeline";
import { buildUserPrompt } from "../../agents/workflow-generator/prompts";
import type { TraceEntry } from "../../agents/workflow-generator/trace";
import { firstFailure } from "../../agents/workflow-generator/trace";
import type { Bindings } from "../../context";
import {
  createDatabase,
  getIntegrations,
  getOrganizationBillingInfo,
  resolveOrganizationBillingOptions,
  stampOnboardingStage,
} from "../../db";
import { users } from "../../db/schema";
import { fetchCloudflareModelCatalog } from "../../runtime/cloudflare-model-catalog";
import { CloudflareNodeRegistry } from "../../runtime/cloudflare-node-registry";
import { availableIntegrationProviders } from "../../services/integration-availability";
import { createResourceProvisioner } from "../../services/resource-provisioner";
import type { WorkflowExecutorParameters } from "../../services/workflow-executor";
import { WorkflowExecutor } from "../../services/workflow-executor";
import { ExampleStore } from "../../stores/example-store";
import type { SaveWorkflowRecord } from "../../stores/workflow-store";
import { WorkflowStore } from "../../stores/workflow-store";
import { isCreditExhausted } from "../../utils/credits";

/**
 * The merged agent's persisted state — declared here because generation is
 * the side that needs it across an interface; the host aliases it. Run
 * status, execution id and the like live in `gen_runs`, not here: this holds
 * only what has no SQL row behind it.
 */
export interface GenerationStateSlice {
  /** Set on editor load AND on generation save; always equals the DO name. */
  workflowId?: string;
  /**
   * Whoever connected last, on either protocol. Shared deliberately: an
   * org-mate opening the editor while the owner generates rewrites this, and
   * a later generation turn would stamp onboarding for the editor user. A
   * pre-existing pattern, acceptable while generation is developer-gated.
   */
  userId?: string;
  apiHost?: string;
  /** Generation connects carry it in a header; the editor derives it from D1. */
  organizationId?: string;
  developerMode?: boolean;
  generationPhase?: GenerationPhase;
}

/**
 * What generation needs from the Durable Object that hosts it.
 *
 * Everything that touches shared ground goes through here: broadcasts are
 * filtered to generation connections by the host, workflow writes go through
 * `saveWorkflowRecord` so the editor side is reconciled, and cleanup rides the
 * Agent SDK schedule system rather than a raw alarm — this object shares its
 * alarm with the editor's debounced persist, and owning it here would break
 * that.
 */
export interface GenerationHost {
  /** The Durable Object name — the workflow id this agent is keyed by. */
  readonly name: string;
  readonly env: Bindings;
  /** DO SQLite storage, holding the gen_* session tables. */
  readonly sql: SqlStorage;
  readonly genState: GenerationStateSlice;
  /** Merge a patch into agent state; the host spreads the existing state. */
  patchState(patch: Partial<GenerationStateSlice>): void;
  /** Send a raw frame payload to generation-tagged connections only. */
  broadcastFrame(payload: string): void;
  waitUntil(promise: Promise<unknown>): void;
  /** Arm (or re-arm) the retention-delayed cleanup schedule. Never throws. */
  scheduleGenerationCleanup(): Promise<void>;
  /**
   * Persist a generated or armed workflow AND reconcile the editor side:
   * cancel pending persist schedules, drop the stale snapshot, refresh the
   * in-memory editor state, broadcast an update to any open editor tabs.
   */
  saveWorkflowRecord(record: SaveWorkflowRecord): Promise<void>;
}

export class GenerationSession {
  private schemaReady = false;

  /** When this session first stored its workflow, so a re-save keeps the date. */
  private createdAt?: Date;

  constructor(private readonly host: GenerationHost) {}

  /** The one session this object holds — the DO name, the workflow id. */
  private get sessionId(): string {
    return this.host.name;
  }

  private get sql(): SqlStorage {
    return this.host.sql;
  }

  // ── Storage ───────────────────────────────────────────────────────────

  private ensureSchema(): void {
    if (this.schemaReady) return;
    this.sql.exec(`
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
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS gen_frames (
        seq        INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        frame      TEXT NOT NULL
      )
    `);
    // The conversation that produced a workflow, so a critique can continue it
    // rather than describe the workflow to a model that never saw it.
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS gen_turns (
        session_id TEXT NOT NULL,
        turn       INTEGER NOT NULL,
        system     TEXT NOT NULL,
        messages   TEXT NOT NULL,
        PRIMARY KEY (session_id, turn)
      )
    `);

    // Added after `gen_runs` shipped. There is no migration to write — a
    // Durable Object that was mid-flight across a deploy still holds the
    // original table, and new objects get the full shape above.
    for (const column of [
      `turn INTEGER NOT NULL DEFAULT 0`,
      `brief TEXT`,
      // The trigger bindings hydration blanked, so `arm` can restore them.
      `disarmed TEXT`,
      // Set when this session took over a workflow it did not build — an
      // adopted workflow keeps its curated examples, a generated one gets
      // the model's.
      `adopted INTEGER NOT NULL DEFAULT 0`,
    ]) {
      try {
        this.sql.exec(`ALTER TABLE gen_runs ADD COLUMN ${column}`);
      } catch {
        // Already present.
      }
    }

    this.schemaReady = true;
  }

  private currentRun() {
    this.ensureSchema();
    const rows = this.sql
      .exec(
        `SELECT status, prompt, cancelled, updated_at, turn, brief, workflow_id, execution_id, disarmed, adopted FROM gen_runs WHERE session_id = ?`,
        this.sessionId
      )
      .toArray() as Array<{
      status: string;
      prompt: string;
      cancelled: number;
      updated_at: number;
      turn: number;
      brief: string | null;
      workflow_id: string | null;
      execution_id: string | null;
      disarmed: string | null;
      adopted: number;
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
  private claimTurn(options: {
    prompt?: string;
    from: GenerationStatus[];
  }): number | undefined {
    this.ensureSchema();
    const existing = this.currentRun();

    if (!existing) {
      // A first turn can only be an opening move.
      if (!options.from.includes("idle")) return undefined;
      this.sql.exec(
        `INSERT INTO gen_runs (session_id, status, prompt, turn, updated_at) VALUES (?, 'running', ?, 0, ?)`,
        this.sessionId,
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
      this.sql.exec(
        `UPDATE gen_runs SET status = 'failed', error = 'stalled', updated_at = ? WHERE session_id = ?`,
        Date.now(),
        this.sessionId
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
    this.sql.exec(
      `UPDATE gen_runs SET status = 'running', cancelled = 0, turn = ?, prompt = ?, updated_at = ? WHERE session_id = ?`,
      turn,
      options.prompt ?? existing.prompt,
      Date.now(),
      this.sessionId
    );
    return turn;
  }

  private storeBrief(brief: Brief | null): void {
    this.sql.exec(
      `UPDATE gen_runs SET status = 'awaiting', brief = ?, updated_at = ? WHERE session_id = ?`,
      brief ? JSON.stringify(brief) : null,
      Date.now(),
      this.sessionId
    );
    // The object now lives in a permanent namespace, so a brief abandoned at
    // this stage would otherwise hold its frames forever — turn end is no
    // longer the only moment that must arm the cleanup.
    void this.host.scheduleGenerationCleanup();
  }

  private storeConversation(
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

    this.sql.exec(
      `INSERT OR REPLACE INTO gen_turns (session_id, turn, system, messages) VALUES (?, ?, ?, ?)`,
      this.sessionId,
      turn,
      system,
      JSON.stringify(trimmed)
    );
  }

  private latestConversation() {
    this.ensureSchema();
    const rows = this.sql
      .exec(
        `SELECT system, messages FROM gen_turns WHERE session_id = ? ORDER BY turn DESC LIMIT 1`,
        this.sessionId
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

  private touch(): void {
    this.sql.exec(
      `UPDATE gen_runs SET updated_at = ? WHERE session_id = ?`,
      Date.now(),
      this.sessionId
    );
  }

  private isCancelled(): boolean {
    return (this.currentRun()?.cancelled ?? 0) === 1;
  }

  /**
   * Appends the frame to the log, then fans it out to generation connections.
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

    this.ensureSchema();
    try {
      this.sql.exec(
        `INSERT INTO gen_frames (session_id, frame) VALUES (?, ?)`,
        this.sessionId,
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
      this.logUnstorableFrame(frame.type, payload.length);
    }

    this.host.broadcastFrame(payload);
  }

  /** Best-effort note that a frame was dropped from the replay log. */
  private logUnstorableFrame(type: string, bytes: number): void {
    const marker: GeneratorServerMessage = {
      type: "log",
      level: "warn",
      message: `A "${type}" update was too large to keep for replay (${bytes.toLocaleString()} bytes). It is on screen now, but will not survive a reload.`,
    };
    try {
      this.sql.exec(
        `INSERT INTO gen_frames (session_id, frame) VALUES (?, ?)`,
        this.sessionId,
        JSON.stringify(marker)
      );
    } catch {
      // Nothing further to try; the run continues either way.
    }
  }

  private replayFrames(connection: Connection): void {
    this.ensureSchema();
    const rows = this.sql
      .exec(
        `SELECT frame FROM gen_frames WHERE session_id = ? ORDER BY seq ASC`,
        this.sessionId
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

    if (!userId || !organizationId) {
      connection.close(1008, "Missing user or organization");
      return;
    }

    // The client mints the id this object is keyed by, and the save path
    // upserts by id — so ownership is settled here, at the door. Another
    // org's workflow is refused without learning the id exists. This org's
    // workflow with no generation history is ADOPTED: a settled run row is
    // seeded so the conversation can pick the workflow up mid-life, exactly
    // as if this session had built it. The conversation itself is fabricated
    // lazily, on the first critique — connecting must stay cheap.
    let run = this.currentRun();
    try {
      const owner = await new WorkflowStore(this.host.env).owningOrganization(
        this.sessionId
      );
      if (owner && owner.organizationId !== organizationId) {
        connection.close(1008, "Session unavailable");
        return;
      }
      if (owner && !run) {
        this.sql.exec(
          `INSERT INTO gen_runs (session_id, status, prompt, workflow_id, turn, adopted, updated_at)
           VALUES (?, 'done', ?, ?, 0, 1, ?)`,
          this.sessionId,
          owner.name,
          this.sessionId,
          Date.now()
        );
        run = this.currentRun();
      }
    } catch (error) {
      console.error("[WorkflowGenerator] ownership check failed:", error);
      connection.close(1011, "Could not verify the session");
      return;
    }

    // A run parked at `awaiting` with no brief was waiting on the old
    // approval gate, whose continuation lived in memory and whose messages no
    // longer exist — nothing can ever resolve it, and cleanup re-arms forever
    // on `awaiting`. Settle it by what it actually achieved: a saved workflow
    // means the session finished its real work. Brief-awaiting rows (brief
    // non-null) are a person mid-conversation and are left alone.
    if (run?.status === "awaiting" && !run.brief) {
      const settled = run.workflow_id ? "done" : "failed";
      this.sql.exec(
        `UPDATE gen_runs SET status = ?, updated_at = ? WHERE session_id = ?`,
        settled,
        Date.now(),
        this.sessionId
      );
      run = this.currentRun();
    }

    this.host.patchState({
      userId,
      organizationId,
      developerMode,
      apiHost: new URL(ctx.request.url).origin,
    });

    connection.send(
      JSON.stringify({
        type: "session",
        sessionId: this.sessionId,
        status: (run?.status as GenerationStatus) ?? "idle",
        phase: this.host.genState.generationPhase,
        prompt: run?.prompt,
        protocol: GENERATOR_PROTOCOL_VERSION,
        // The pointer that survives frame pruning: an hour after a run
        // settles the replay log is gone, and these are what still tell a
        // returning visitor where the thing they built lives.
        workflowId: run?.workflow_id ?? undefined,
        executionId: run?.execution_id ?? undefined,
      } satisfies GeneratorServerMessage)
    );

    this.replayFrames(connection);
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

    switch (parsed.type) {
      case "ask": {
        // The opening move, and allowed again from any settled state:
        // retyping after suggestions, or starting over from a finished run,
        // are both the same move. Claim first so a duplicate is ignored
        // rather than regenerating, and return immediately so `cancel` can
        // still be received.
        const turn = this.claimTurn({
          prompt: parsed.prompt,
          from: ["idle", "awaiting", "done", "failed"],
        });
        if (turn !== undefined) {
          this.host.waitUntil(this.runBrief(turn, parsed.prompt));
        }
        return;
      }
      case "resolve": {
        const stored = this.currentRun();
        if (!stored?.brief) return;
        const brief = JSON.parse(stored.brief) as Brief;

        const turn = this.claimTurn({ from: ["awaiting"] });
        if (turn !== undefined) {
          // The honest "they committed to what we understood" event, and the
          // only one of the funnel's stages that this flow alone can report.
          const userId = this.host.genState.userId;
          if (userId) {
            this.host.waitUntil(
              stampOnboardingStage(
                createDatabase(this.host.env.DB),
                userId,
                "briefResolved"
              ).catch((error) =>
                console.error("[WorkflowGenerator] stamp failed:", error)
              )
            );
          }
          this.host.waitUntil(
            this.runPipeline(turn, {
              brief,
              answers: parsed.answers,
            })
          );
        }
        return;
      }
      case "critique": {
        const stored = this.currentRun();
        // Nothing to correct without a workflow behind the session. A missing
        // conversation is no longer a refusal: an adopted workflow gets one
        // fabricated on its first critique.
        if (!stored?.workflow_id) return;

        // `failed` is claimable too: a turn that crashed leaves the workflow
        // standing, and the Describe rail has no "start over" — a critique
        // must be able to pick the session back up.
        const turn = this.claimTurn({ from: ["done", "failed"] });
        if (turn !== undefined) {
          this.host.waitUntil(
            this.runCritique(turn, parsed.note, stored.workflow_id)
          );
        }
        return;
      }
      case "arm": {
        // No turn is claimed: arming spends no model call and moves no
        // conversation forward. It is only legal on a finished session with a
        // stored workflow and something actually disarmed — anything else is
        // a duplicate click or a stale client, and ignoring is right because
        // the restore is idempotent anyway.
        const stored = this.currentRun();
        if (stored?.status !== "done" || !stored.workflow_id) return;
        if (!stored.disarmed) return;

        let disarmed: DisarmedInput[];
        try {
          disarmed = JSON.parse(stored.disarmed) as DisarmedInput[];
        } catch {
          return;
        }
        if (disarmed.length === 0) return;

        this.host.waitUntil(this.armWorkflow(stored.workflow_id, disarmed));
        return;
      }
      case "cancel": {
        this.ensureSchema();
        this.sql.exec(
          `UPDATE gen_runs SET cancelled = 1, updated_at = ? WHERE session_id = ?`,
          Date.now(),
          this.sessionId
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
          `[WorkflowGenerator] Ignoring unknown message type: ${
            (parsed as { type?: unknown }).type
          }`
        );
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  /**
   * The generation-cleanup schedule callback body.
   *
   * The conversation is permanent; the replay log is not. `gen_runs` and
   * `gen_turns` are a few small rows that keep critique working indefinitely,
   * while `gen_frames` holds a full serialized graph per repair round — so an
   * hour after a run settles, the frames go and the rest stays. A session
   * that never saved anything has no conversation worth keeping either, so
   * all three tables empty out. Generation deletes only its own tables,
   * never the object: this Durable Object also holds form tokens, execution
   * buffers and the editor's persistence machinery, and no generation path
   * may be able to take those down.
   */
  async cleanup(): Promise<void> {
    const run = this.currentRun();
    if (!run) return;

    // A session is not over just because a run is: a critique moves it back
    // to `running`, and `awaiting` is someone still reading. Pruning under
    // either would take the session out from under a live user.
    if (run.status === "running" || run.status === "awaiting") {
      await this.host.scheduleGenerationCleanup();
      return;
    }

    this.sql.exec(
      `DELETE FROM gen_frames WHERE session_id = ?`,
      this.sessionId
    );
    if (!run.workflow_id) {
      this.sql.exec(
        `DELETE FROM gen_turns WHERE session_id = ?`,
        this.sessionId
      );
      this.sql.exec(
        `DELETE FROM gen_runs WHERE session_id = ?`,
        this.sessionId
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
  private async prepare() {
    const userId = this.host.genState.userId;
    const organizationId = this.host.genState.organizationId;
    if (!userId || !organizationId) return undefined;

    const db = createDatabase(this.host.env.DB);

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
      this.fail({
        type: "error",
        code: "INTERNAL",
        message: "Something broke on my end before it could start. Try again.",
        recoverable: true,
      });
      return undefined;
    }

    if (!billingInfo) {
      this.fail({
        type: "error",
        code: "INTERNAL",
        message: "Organization not found.",
        recoverable: false,
      });
      return undefined;
    }

    if (isCreditExhausted(billingInfo, this.host.env.CLOUDFLARE_ENV)) {
      // Counted, because this is the one refusal that is a business signal
      // rather than a defect: it says someone wanted to build something and
      // the workspace could not afford to.
      this.recordGeneration({
        organizationId,
        outcome: "refused",
        durationMs: 0,
        turn: 0,
        errorCode: "CREDITS_EXHAUSTED",
      });
      this.fail({
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
      !this.host.env.CLOUDFLARE_ACCOUNT_ID ||
      !this.host.env.CLOUDFLARE_AI_GATEWAY_ID ||
      !this.host.env.CLOUDFLARE_API_TOKEN
    ) {
      this.fail({
        type: "error",
        code: "MISCONFIGURED",
        message:
          "Workflow generation is not configured on this deployment (missing AI Gateway settings).",
        recoverable: false,
      });
      return undefined;
    }

    const registry = new CloudflareNodeRegistry(
      this.host.env,
      this.host.genState.developerMode ?? false
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

    // The live Workers AI catalog, so the model descriptions the generator
    // reads evolve with what Cloudflare serves. Best-effort by construction:
    // without it the hand-written descriptions stand, which is exactly what
    // shipped before.
    let modelCatalog: CloudflareModelInfo[] = [];
    try {
      modelCatalog = await fetchCloudflareModelCatalog(this.host.env, {
        waitUntil: (promise) => this.host.waitUntil(promise),
      });
    } catch (error) {
      console.warn(
        "[WorkflowGenerator] model catalog unavailable, using static descriptions:",
        error instanceof Error ? error.message : error
      );
    }

    const nodeTypes = registry.getNodeTypes() as NodeType[];

    // One integration per provider, for auto-binding onto generated nodes.
    // Active beats expired (an expired one still binds — reconnecting heals
    // it in place, and silently stubbing a step the user believes is live
    // would be worse); revoked never binds. Newest wins within a rank, and
    // the editor's integration field lets the user swap the choice.
    const integrationsByProvider = new Map<
      string,
      { id: string; name: string }
    >();
    const rank = (status: string) => (status === "active" ? 0 : 1);
    const usable = integrations
      .filter((integration) => integration.status !== "revoked")
      .sort(
        (a, b) =>
          rank(a.status) - rank(b.status) ||
          b.createdAt.getTime() - a.createdAt.getTime()
      );
    for (const integration of usable) {
      if (!integrationsByProvider.has(integration.provider)) {
        integrationsByProvider.set(integration.provider, {
          id: integration.id,
          name: integration.name,
        });
      }
    }

    return {
      userId,
      organizationId,
      billingInfo,
      ownerEmail,
      orgResources,
      modelCatalog,
      nodeTypes,
      // Built once per turn, here, because every turn's prompt needs it and
      // three call sites had already drifted into keeping identical copies.
      grounding: buildGroundingContext({
        nodeTypes,
        orgResources,
        emailDomain: this.host.env.EMAIL_DOMAIN,
        modelCatalog,
      }),
      integrationsByProvider: integrationsByProvider as ReadonlyMap<
        string,
        { id: string; name: string }
      >,
      // Derived from the same map so "connected" and "bindable" cannot drift.
      connectedProviders: new Set(
        integrationsByProvider.keys()
      ) as ReadonlySet<string>,
      availableProviders: new Set(
        availableIntegrationProviders(this.host.env)
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
  private async runBrief(turn: number, prompt: string): Promise<void> {
    const context = await this.prepare();
    if (!context) return;

    try {
      this.emit({
        type: "phase",
        phase: "briefing",
        label: "Reading that back",
      });
      this.touch();

      // Identical inputs to the pipeline's own eligibility pass, so the brief
      // and synthesis agree by construction about what can be offered. These
      // used to diverge: the brief filtered without resource knowledge.
      const { eligible } = filterEligible(context.nodeTypes, {
        connectedProviders: context.connectedProviders,
        availableProviders: context.availableProviders,
        offerableResources: offerableResources(context.orgResources),
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
        // The sentence can only name what the workspace really has — this is
        // where the org's own components reach the brief's judgement.
        grounding: context.grounding,
        callLLM: (call: GenerateCall) => this.callModel(call),
      });

      this.logUsage(context.organizationId, "brief", {
        fast: outcome.usage,
        synthesis: { inputTokens: 0, outputTokens: 0 },
      });

      // Our end broke. Say so, and keep it recoverable — the request was fine
      // and retyping it is not what needs to happen. The diagnostic goes to
      // the log: the moment something breaks is exactly when the voice has to
      // hold, and "(segments=string(1200), keys=0,1,2)" is not a sentence.
      if (outcome.kind === "failed") {
        console.error(
          `[WorkflowGenerator] brief failed: ${outcome.message} (session=${this.sessionId})`
        );
        this.fail({
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
        this.storeBrief(null);
        return;
      }

      this.emit({ type: "brief", turn, brief: outcome.brief });
      this.storeBrief(outcome.brief);
    } catch (error) {
      console.error("[WorkflowGenerator] brief crashed:", error);
      this.fail({
        type: "error",
        code: "INTERNAL",
        message:
          "Something went wrong on my end reading that back. Your request was fine — try again.",
        recoverable: true,
      });
    }
  }

  /**
   * One row per finished generation, for the admin view.
   *
   * Deliberately metadata only: the trigger, the outcome, where it broke and
   * what it cost. No prompt text and no graph contents — Analytics Engine has
   * no row delete, so anything written here outlives an erasure request and
   * leaves with nothing. Everything below is either our own vocabulary (node
   * types, trigger names, validation codes) or a number.
   *
   * The question it exists to answer is the one the pipeline's own logs cannot:
   * not "did this generation work" but "what is failing, across everybody, and
   * how often". A stage that breaks for one person is a bug report; the same
   * stage breaking for a fifth of requests is a defect with a size.
   *
   * Fire-and-forget, like the execution store's — telemetry must never be the
   * reason a generation the user is waiting on fails.
   */
  private recordGeneration(input: {
    organizationId: string;
    outcome: string;
    workflowId?: string;
    trigger?: string;
    nodeTypes?: string[];
    trace?: TraceEntry[];
    usage?: TierUsage;
    durationMs: number;
    turn: number;
    errorCode?: string;
  }): void {
    try {
      const failure = input.trace ? firstFailure(input.trace) : undefined;

      // Codes, never messages. A validation message is written for the model
      // and can quote the user's own text back; the code is an enum of ours.
      const fatalCodes = [
        ...new Set(
          (input.trace ?? []).flatMap((entry) =>
            entry.stage === "validate" ? entry.fatal : []
          )
        ),
      ].join(",");

      const repairs = (input.trace ?? []).filter(
        (entry) => entry.stage === "draft" && entry.kind === "repair"
      ).length;

      const tokens = input.usage
        ? (Object.keys(input.usage) as Array<keyof TierUsage>).reduce(
            (total, tier) => ({
              input: total.input + input.usage![tier].inputTokens,
              output: total.output + input.usage![tier].outputTokens,
            }),
            { input: 0, output: 0 }
          )
        : { input: 0, output: 0 };

      this.host.env.GENERATIONS.writeDataPoint({
        indexes: [input.organizationId],
        blobs: [
          this.sessionId,
          input.workflowId ?? "",
          input.outcome,
          failure?.stage ?? "",
          fatalCodes.substring(0, 500),
          input.trigger ?? "",
          // Sorted so the same graph reads the same way across rows, and
          // truncated because a wide workflow is not worth 16KB of blob.
          [...new Set(input.nodeTypes ?? [])]
            .sort()
            .join(",")
            .substring(0, 2000),
          input.errorCode ?? "",
        ],
        doubles: [
          input.durationMs,
          repairs,
          input.nodeTypes?.length ?? 0,
          tokens.input,
          tokens.output,
          input.turn,
        ],
      });
    } catch (error) {
      console.error("[WorkflowGenerator] recordGeneration failed:", error);
    }
  }

  private logUsage(
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
      `[WorkflowGenerator] session=${this.sessionId} org=${organizationId} stage=${stage} fast=${usage.fast.inputTokens}/${usage.fast.outputTokens} synthesis=${usage.synthesis.inputTokens}/${usage.synthesis.outputTokens} credits=${credits}`
    );
  }

  /**
   * Corrects what the session's workflow currently is, in conversation.
   *
   * A session that built its workflow resumes the conversation that produced
   * it. An adopted session has no such conversation, so its first critique
   * fabricates the one the pipeline would have left behind — the request as
   * a user message, the workflow itself (projected into the model's own
   * dialect) as the last assistant draft. From then on it IS the
   * conversation: the turn's end stores the real exchange, and a crash
   * before that simply re-fabricates next time.
   */
  private async runCritique(
    turn: number,
    note: string,
    workflowId: string
  ): Promise<void> {
    const conversation = this.latestConversation();
    if (conversation) {
      await this.runPipeline(turn, {
        resume: { ...conversation, note, workflowId },
      });
      return;
    }

    const organizationId = this.host.genState.organizationId;
    if (!organizationId) return;

    const stored = await new WorkflowStore(this.host.env).getWithData(
      workflowId,
      organizationId
    );
    if (!stored) {
      this.fail({
        type: "error",
        code: "INTERNAL",
        message: "I couldn't read that workflow to change it.",
        recoverable: false,
      });
      return;
    }

    // The stand-in for the request nobody typed — the name and description
    // are the closest thing to intent the workflow carries. As the prompt of
    // a resume without a stored system, it seeds candidate selection and the
    // few-shots inside the pipeline itself, so the catalog the model is
    // offered and the one hydration resolves against are the same set. It
    // also bounds what this first critique can name; later critiques replay
    // the conversation this turn stores.
    const query = stored.data.description
      ? `${stored.name}: ${stored.data.description}`
      : stored.name;
    const draft = workflowToDraft({ ...stored.data, name: stored.name });

    await this.runPipeline(turn, {
      prompt: query,
      resume: {
        messages: [
          { role: "user", content: buildUserPrompt(query) },
          { role: "assistant", content: JSON.stringify(draft) },
        ],
        note,
        workflowId,
      },
    });
  }

  /**
   * Builds, saves and runs — from a raw prompt, an accepted brief, or a
   * critique of what was already built.
   */
  private async runPipeline(
    turn: number,
    input: {
      prompt?: string;
      brief?: Brief;
      answers?: BriefAnswers;
      resume?: {
        system?: string;
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        note: string;
        workflowId: string;
      };
    }
  ): Promise<void> {
    const context = await this.prepare();
    if (!context) return;

    const { userId, organizationId, billingInfo } = context;
    // Wall clock across the whole pipeline, which is what someone waiting on
    // it experiences — the per-tier token counts are the cost, this is the
    // wait.
    const startedAt = Date.now();

    try {
      // What the model is asked to build. A brief resolves to a sentence plus
      // an explicit destination; a raw prompt is its own instruction.
      const answers = input.answers ?? {};

      // Grounded bindings are re-validated against what the org owns *now* —
      // the brief may be minutes old and a dataset may have been deleted in
      // the meantime — and existing bindings pick up their authoritative
      // instance names, which is what the synthesis prompt states.
      const resourceBindings = input.brief
        ? resolveResourceBindings(input.brief, answers).flatMap((entry) => {
            const bound = entry.binding;
            if (bound.kind === "create") return [entry];
            const owned = (context.orgResources[entry.family] ?? []).find(
              (resource) => resource.id === bound.resourceId
            );
            if (!owned) {
              console.warn(
                `[WorkflowGenerator] dropping stale ${entry.family} binding ${bound.resourceId} (session=${this.sessionId})`
              );
              return [];
            }
            return [{ ...entry, binding: { ...bound, name: owned.name } }];
          })
        : [];

      const prompt = input.brief
        ? buildSynthesisPrompt(input.brief, answers, resourceBindings)
        : (input.prompt ?? "");

      // An unconnected destination no longer blocks the build. The workflow
      // is generated anyway, its provider steps rehearse on stand-in data,
      // and the outcome screen carries the "connect it to make this live"
      // call to action — a right-shaped draft beats an error frame.
      const destination = input.brief
        ? resolveDestination(input.brief, answers)
        : undefined;

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
          this.storeConversation(turn, system, messages),
        nodeTypes: context.nodeTypes,
        connectedProviders: context.connectedProviders,
        availableProviders: context.availableProviders,
        integrationsByProvider: context.integrationsByProvider,
        orgResources: context.orgResources,
        resourceBindings,
        createResource: createResourceProvisioner(
          createDatabase(this.host.env.DB),
          organizationId
        ),
        grounding: context.grounding,
        modelCatalog: context.modelCatalog,
        ownerEmail: context.ownerEmail,
        apiHost: this.host.genState.apiHost,
        isCancelled: () => this.isCancelled(),
        emit: (frame) => {
          // Only phase frames advance the stall clock. Touching on every frame
          // doubled the storage writes per run to keep a timestamp that is only
          // ever compared against a three-minute threshold.
          if (frame.type === "phase") {
            this.host.patchState({ generationPhase: frame.phase });
            this.touch();
          }
          this.emit(frame);
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
        run: (workflow, workflowId, parameters, inputOverrides, options) =>
          this.runOnce(
            workflow,
            workflowId,
            userId,
            organizationId,
            billingInfo,
            parameters,
            inputOverrides,
            options
          ),
      });

      this.logUsage(organizationId, `build:${result.outcome}`, result.usage);
      this.recordGeneration({
        organizationId,
        outcome: result.outcome,
        workflowId: result.workflowId,
        trigger: result.workflow?.trigger,
        nodeTypes: result.workflow?.nodes.map((node) => node.type),
        trace: result.trace,
        usage: result.usage,
        durationMs: Date.now() - startedAt,
        turn,
      });

      this.sql.exec(
        `UPDATE gen_runs SET status = ?, workflow_id = ?, execution_id = ?, disarmed = ?, updated_at = ? WHERE session_id = ?`,
        result.outcome === "failed" ? "failed" : "done",
        result.workflowId ?? null,
        result.executionId ?? null,
        result.disarmed && result.disarmed.length > 0
          ? JSON.stringify(result.disarmed)
          : null,
        Date.now(),
        this.sessionId
      );

      // The shared field: only written when a save actually happened — a
      // failed run has no workflowId to contribute, and status/execution id
      // live in gen_runs, not in agent state.
      if (result.workflowId) {
        this.host.patchState({ workflowId: result.workflowId });
      }

      await this.host.scheduleGenerationCleanup();
    } catch (error) {
      console.error("[WorkflowGenerator] pipeline crashed:", error);
      // A crash never reaches the settle path above, and it is the outcome
      // most worth counting — invisible to the user beyond "try again", and
      // indistinguishable from a model failure unless it is recorded here.
      this.recordGeneration({
        organizationId,
        outcome: "crashed",
        durationMs: Date.now() - startedAt,
        turn,
        errorCode: "INTERNAL",
      });
      this.fail({
        type: "error",
        code: "INTERNAL",
        message:
          "Something broke on my end while building that. Your request was fine — try again.",
        recoverable: true,
      });
    }
  }

  private fail(frame: GeneratorServerMessage): void {
    this.ensureSchema();
    this.sql.exec(
      `UPDATE gen_runs SET status = 'failed', updated_at = ? WHERE session_id = ?`,
      Date.now(),
      this.sessionId
    );
    this.emit(frame);
    void this.host.scheduleGenerationCleanup();
  }

  /**
   * The shipping dispatch path, shared with both harnesses.
   *
   * Never overridden here: a model sweep is an experiment, and a deployment
   * serving one is a deployment nobody chose.
   */
  private async callModel(call: GenerateCall) {
    return createModelRouter(this.host.env)(call);
  }

  /**
   * Restores the trigger bindings hydration blanked, making the workflow live.
   *
   * The values go back exactly as they were captured, through the host's save
   * path like every other write — `syncTriggers` then registers the trigger
   * with `active: true`, which is the arming. Idempotent: restoring an input
   * that already holds the value writes the same workflow again.
   */
  private async armWorkflow(
    workflowId: string,
    disarmed: DisarmedInput[]
  ): Promise<void> {
    const organizationId = this.host.genState.organizationId;
    if (!organizationId) return;

    try {
      const store = new WorkflowStore(this.host.env);
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

      await this.host.saveWorkflowRecord({
        id: workflowId,
        name: stored.name,
        description: stored.data.description,
        trigger: stored.data.trigger,
        runtime: stored.data.runtime ?? "workflow",
        organizationId,
        nodes,
        edges: stored.data.edges,
        apiHost: this.host.genState.apiHost,
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
   * `existingId` makes this an update, which is how a repaired run replaces
   * what it already stored; a first save uses the object's own name — the id
   * the session was opened with is the id the workflow lives under. `createdAt`
   * is pinned to the first save because the D1 write is an upsert that would
   * otherwise stamp the row as newly created every time the generator corrects
   * itself.
   */
  private async saveWorkflow(
    workflow: Workflow,
    examples: WorkflowExample[],
    userId: string,
    organizationId: string,
    existingId?: string
  ): Promise<string> {
    const workflowId = existingId ?? this.sessionId;

    if (!existingId) this.createdAt = new Date();

    // An update-in-place keeps what the row already says about itself: the
    // runtime someone chose and the original creation date. Hardcoding the
    // runtime silently converted adopted "worker" workflows, and the
    // in-memory createdAt does not survive a DO eviction, which restamped
    // the row on every critique of an older session. Read fresh per save —
    // a point read is nothing next to the turn's model calls, and a cache
    // here would serve a runtime the editor changed between critiques.
    const existing = existingId
      ? await new WorkflowStore(this.host.env)
          .get(existingId, organizationId)
          .catch((error) => {
            console.error("[WorkflowGenerator] could not read the row:", error);
            return undefined;
          })
      : undefined;
    const createdAt = existing?.createdAt ?? this.createdAt;

    await this.host.saveWorkflowRecord({
      id: workflowId,
      name: workflow.name || "Generated Workflow",
      description: workflow.description,
      trigger: workflow.trigger,
      runtime: existing?.runtime ?? "workflow",
      organizationId,
      nodes: workflow.nodes,
      edges: workflow.edges,
      apiHost: this.host.genState.apiHost,
      ...(createdAt && { createdAt }),
    });

    // The test inputs the model wrote are saved beside the graph, so the user
    // can edit and re-run them without touching it. Best-effort: a generated
    // workflow that saved but has no examples is still usable. An ADOPTED
    // workflow's examples are the user's own document, curated before this
    // session existed — those are never overwritten.
    if (this.currentRun()?.adopted !== 1) {
      try {
        await new ExampleStore(this.host.env).save(workflowId, examples);
      } catch (error) {
        console.error("Failed to save the generated examples:", error);
      }
    }

    // Only on first save: the stage records that a workflow was created, and a
    // repair round does not create a second one.
    if (!existingId) {
      const db = createDatabase(this.host.env.DB);
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
    inputOverrides?: InputOverrides,
    options?: { rehearsal: boolean }
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
      ...(options?.rehearsal && { rehearsal: true }),
      env: this.host.env,
    });

    return execution;
  }
}
