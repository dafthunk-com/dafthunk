/**
 * WorkflowAgent Durable Object
 *
 * One object per workflow, named by the workflow id, hosting both ways of
 * changing it: the editor's direct-manipulation session and the AI generator's
 * conversation. Manages workflow state synchronization, WebSocket connections,
 * and execution triggering. Extends the Cloudflare Agents SDK `Agent` base
 * class for built-in WebSocket management and workflow orchestration via
 * AgentWorkflow callbacks.
 *
 * ## Two protocols, one object
 *
 * Editor connections arrive via `/ws/` and speak the graph protocol
 * (update/execute in, init/update/execution_update out). Generation
 * connections arrive via `/generate/` and speak the generator protocol
 * (ask/resolve/critique/… in, streamed frames out). Each connection is tagged
 * with its kind at connect, and `sendToTagged` is the only fan-out path —
 * a generator frame reaching an editor socket would be closed as a protocol
 * violation by the client, so the filter is load-bearing, not cosmetic.
 *
 * The generation side lives in `GenerationSession` and touches the workflow
 * only through `saveWorkflowRecord`, which reconciles any open editor session
 * with what generation saved. One writer, no cross-object races.
 *
 * ## Hibernation Safety
 *
 * This DO uses WebSocket hibernation (Agent SDK default). All in-memory fields
 * are lost when the DO hibernates. The design ensures correctness by storing
 * critical state in persistent mechanisms:
 *
 * - **Agent state** (`this.state`): workflowId, userId, apiHost, generation status
 * - **Connection state** (`connection.setState`): kind + executionId per connection
 * - **DO storage** (`this.storage`): pending persist snapshots, execution buffers
 * - **DO SQL storage** (`ctx.storage.sql`): the generation conversation tables
 * - **Agent SDK schedules**: debounced persistence timer, generation cleanup
 *
 * In-memory fields (`workflowState`, `organizationId`, `executionManager`,
 * `generationSession`) are caches, reconstructed on demand after hibernation
 * wake.
 *
 * Callers obtain a stub via getAgentByName() which initializes the partyserver
 * name required by Agent internals. Direct idFromName/get access will fail.
 */

import type { RuntimeParams } from "@dafthunk/runtime";
import type {
  ClientMessage,
  WorkflowExecuteMessage,
  WorkflowExecution,
  WorkflowExecutionUpdateMessage,
  WorkflowInitMessage,
  WorkflowState,
  WorkflowUpdateMessage,
} from "@dafthunk/types";
import { Agent } from "agents";
import type { Connection, ConnectionContext } from "partyserver";
import { RUN_RETENTION_MS } from "../../agents/workflow-generator";
import type { Bindings } from "../../context";
import { ExecutionManager } from "../../services/execution-manager";
import type { SaveWorkflowRecord } from "../../stores/workflow-store";
import { WorkflowStore } from "../../stores/workflow-store";
import type {
  GenerationHost,
  GenerationStateSlice,
} from "./generation-session";
import { GenerationSession } from "./generation-session";

// ── Agent SDK type shim ──────────────────────────────────────────────────
// The agents bundled d.ts doesn't resolve some inherited Agent/Server methods
// due to transitive partyserver type resolution issues. The methods exist at
// runtime. We define typed wrappers on the class to contain the cast in one
// place rather than scattering it across call sites.

interface HiddenAgentMethods {
  readonly name: string;
  getConnections(): Iterable<Connection>;
  runWorkflow(
    workflowName: string,
    params: RuntimeParams,
    options?: { id?: string }
  ): Promise<string>;
  terminateWorkflow(workflowId: string): Promise<void>;
  schedule(
    when: number,
    callback: string,
    payload?: unknown
  ): Promise<{ id: string }>;
  cancelSchedule(id: string): Promise<boolean>;
  getSchedules(): Array<{ id: string; callback: string }>;
}

// ── Types ────────────────────────────────────────────────────────────────

/**
 * The one persisted state shape both sides share — declared with the
 * generation module because the host seam needs it; aliased here so the
 * agent's own name for it stays local.
 */
type WorkflowAgentState = GenerationStateSlice;

/**
 * Per-connection tag, set before the first await of onConnect. Which protocol
 * a socket speaks decides which fan-outs may reach it — the editor client
 * closes on any frame type it does not know, so an untagged or cross-tagged
 * send is not noise but a killed session.
 */
interface ConnectionState {
  kind: "editor" | "generation";
  executionId?: string;
}

interface PendingPersist {
  workflowState: WorkflowState;
  organizationId: string;
  apiHost?: string;
}

interface BufferedExecution {
  execution: WorkflowExecution;
  bufferedAt: number;
}

// ── WorkflowAgent ────────────────────────────────────────────────────────

export class WorkflowAgent extends Agent<Bindings, WorkflowAgentState> {
  private static readonly PERSIST_DEBOUNCE_MS = 500;
  private static readonly STORAGE_KEY_DIRTY = "dirty:persist";
  private static readonly STORAGE_PREFIX_EXEC_BUFFER = "execbuf:";
  private static readonly STORAGE_PREFIX_FORM = "form:";
  private static readonly STORAGE_PREFIX_FEEDBACK_FORM = "fform:";

  initialState: WorkflowAgentState = {};

  // In-memory caches — reconstructed on demand after hibernation wake.
  // Loss of these fields is harmless; they are never the source of truth.
  private executionManager: ExecutionManager | null = null;
  private workflowState: WorkflowState | null = null;
  private organizationId: string | null = null;
  private generationSession: GenerationSession | null = null;

  // ── Agent SDK method wrappers ─────────────────────────────────────────
  // Each wraps the cast once. Call sites use these instead of agentSelf().

  private get hiddenMethods(): HiddenAgentMethods {
    return this as unknown as HiddenAgentMethods;
  }

  private get durableCtx(): DurableObjectState {
    return (this as unknown as { ctx: DurableObjectState }).ctx;
  }

  /** DO transactional storage — survives hibernation. */
  private get storage(): DurableObjectStorage {
    return this.durableCtx.storage;
  }

  /**
   * Send to the connections speaking one protocol, and only those. The other
   * protocol's client would close on the unknown frame, so this is the sole
   * fan-out path — nothing may call the SDK's broadcast directly.
   */
  private sendToTagged(
    kind: ConnectionState["kind"],
    msg: string,
    exclude?: string[]
  ): void {
    for (const conn of this.hiddenMethods.getConnections()) {
      const state = conn.state as ConnectionState | undefined;
      if (state?.kind !== kind) continue;
      if (exclude?.includes(conn.id)) continue;
      try {
        conn.send(msg);
      } catch {
        // A dead socket; its close handler will clean up.
      }
    }
  }

  /** The one record→editor-state mapping, shared by the load and save paths. */
  private setWorkflowStateFrom(
    workflowId: string,
    source: {
      name: string;
      description?: string | null;
      trigger: string;
      runtime?: string;
      nodes: WorkflowState["nodes"];
      edges: WorkflowState["edges"];
    },
    timestamp: number
  ): void {
    this.workflowState = {
      id: workflowId,
      name: source.name,
      description: source.description ?? undefined,
      trigger: source.trigger as WorkflowState["trigger"],
      runtime: source.runtime as WorkflowState["runtime"],
      nodes: source.nodes,
      edges: source.edges,
      timestamp,
    };
  }

  /** Push the current editor state to editor tabs, minus the sender if any. */
  private broadcastWorkflowState(exclude?: string[]): void {
    if (!this.workflowState) return;
    const message: WorkflowUpdateMessage = {
      type: "update",
      state: this.workflowState,
    };
    this.sendToTagged("editor", JSON.stringify(message), exclude);
  }

  /**
   * Record which execution a connection watches — preserving its protocol
   * tag, because setState replaces the whole attachment. The `kind` default
   * covers attachments written before tagging existed; onMessage routes
   * untagged connections to the editor path, so the default agrees with
   * dispatch.
   */
  private tagExecution(connection: Connection, executionId: string): void {
    connection.setState({
      kind: "editor",
      ...(connection.state as ConnectionState | undefined),
      executionId,
    } satisfies ConnectionState);
  }

  // ── Generation side ───────────────────────────────────────────────────

  private get generation(): GenerationSession {
    if (!this.generationSession) {
      this.generationSession = new GenerationSession(
        this.createGenerationHost()
      );
    }
    return this.generationSession;
  }

  private createGenerationHost(): GenerationHost {
    // An adapter rather than `implements`: it keeps the host surface private
    // on this class, and `name` must be read off the runtime instance — a
    // class getter of the same name would shadow the base field.
    const agent = this;
    return {
      get name() {
        return agent.hiddenMethods.name;
      },
      get env() {
        return agent.env;
      },
      get sql() {
        return agent.storage.sql;
      },
      get genState() {
        return agent.state ?? {};
      },
      patchState: (patch) => {
        agent.setState({ ...agent.state, ...patch });
      },
      broadcastFrame: (payload) => {
        agent.sendToTagged("generation", payload);
      },
      waitUntil: (promise) => {
        agent.durableCtx.waitUntil(promise);
      },
      scheduleGenerationCleanup: () => agent.scheduleGenerationCleanup(),
      saveWorkflowRecord: (record) => agent.saveWorkflowRecord(record),
    };
  }

  /** Called by the Agent SDK schedule system when the retention delay fires. */
  async generationCleanupCallback(): Promise<void> {
    await this.generation.cleanup();
  }

  /**
   * Arm (or re-arm) the generation cleanup, one retention period out. Uses
   * the SDK schedule system, not a raw alarm: this object's alarm belongs to
   * the SDK, which also drives the editor's debounced persist — an override
   * here would break both.
   */
  private async scheduleGenerationCleanup(): Promise<void> {
    try {
      this.cancelSchedulesFor("generationCleanupCallback");
      await this.hiddenMethods.schedule(
        RUN_RETENTION_MS / 1000,
        "generationCleanupCallback"
      );
    } catch (error) {
      console.error("[WorkflowGenerator] failed to schedule cleanup:", error);
    }
  }

  /**
   * The one path a generated or armed workflow takes to disk — and the moment
   * the editor side converges on it.
   *
   * Order matters: the stale persist schedule and its snapshot go first, so a
   * debounced editor save queued before this write cannot fire mid-save and
   * clobber it with the graph the generation just replaced. Anything the
   * editor sends after this is a legitimately newer edit and wins as usual.
   */
  async saveWorkflowRecord(record: SaveWorkflowRecord): Promise<void> {
    this.cancelPersistSchedules();
    await this.storage.delete(WorkflowAgent.STORAGE_KEY_DIRTY);

    await new WorkflowStore(this.env).save(record);

    this.setWorkflowStateFrom(record.id, record, Date.now());
    this.organizationId = record.organizationId;
    if (this.state?.workflowId !== record.id) {
      this.setState({ ...this.state, workflowId: record.id });
    }

    this.broadcastWorkflowState();
  }

  async executeWorkflow(params: RuntimeParams): Promise<string> {
    const id = crypto.randomUUID();
    return this.hiddenMethods.runWorkflow("EXECUTE", params, { id });
  }

  async cancelWorkflow(workflowId: string): Promise<void> {
    await this.hiddenMethods.terminateWorkflow(workflowId);
  }

  // ── Agent SDK overrides ───────────────────────────────────────────────

  shouldSendProtocolMessages(
    _connection: Connection,
    _ctx: ConnectionContext
  ): boolean {
    return false;
  }

  // ── WebSocket lifecycle ───────────────────────────────────────────────

  async onConnect(
    connection: Connection,
    ctx: ConnectionContext
  ): Promise<void> {
    // Which protocol this socket speaks — stamped by the route, like the
    // identity headers, so the contract between route and object is explicit
    // rather than inferred from URL shape. Tagged synchronously, before any
    // await, so no fan-out can ever see an untagged connection.
    if (ctx.request.headers.get("X-Agent-Protocol") === "generation") {
      connection.setState({ kind: "generation" } satisfies ConnectionState);
      await this.generation.onConnect(connection, ctx);
      return;
    }
    connection.setState({ kind: "editor" } satisfies ConnectionState);

    const url = new URL(ctx.request.url);
    const userId = ctx.request.headers.get("X-User-Id") || "";
    const workflowId =
      ctx.request.headers.get("x-partykit-room") ||
      url.pathname.split("/").pop() ||
      "";

    if (!workflowId || !userId) {
      connection.close(1008, "Missing workflowId or userId");
      return;
    }

    this.setApiHost(url.origin);

    if (!(await this.tryLoadState(workflowId, userId))) {
      connection.close(1008, "Failed to load workflow state");
      return;
    }

    if (this.workflowState) {
      const initMessage: WorkflowInitMessage = {
        type: "init",
        state: this.workflowState,
      };
      connection.send(JSON.stringify(initMessage));
    }
  }

  async onMessage(
    connection: Connection,
    message: string | ArrayBuffer
  ): Promise<void> {
    // Per-connection protocol, per-protocol policy: generation ignores
    // unknown message types (a client one deploy ahead must not lose its
    // run), the editor closes on them.
    if (
      (connection.state as ConnectionState | undefined)?.kind === "generation"
    ) {
      await this.generation.onMessage(connection, message);
      return;
    }

    try {
      await this.requireInitialized();

      if (typeof message !== "string") {
        connection.close(1003, "Binary messages not supported");
        return;
      }

      const parsed = this.parseMessage(message);
      if (!parsed || !("type" in parsed)) {
        connection.close(1003, "Invalid message format");
        return;
      }

      switch (parsed.type) {
        case "update":
          await this.handleUpdateMessage(
            connection,
            parsed as WorkflowUpdateMessage
          );
          break;
        case "execute":
          await this.handleExecuteMessage(
            connection,
            parsed as WorkflowExecuteMessage
          );
          break;
        default:
          connection.close(1003, "Unknown message type");
          break;
      }
    } catch (error) {
      console.error("Failed to process message:", error);
      connection.close(1011, "Message processing failed");
    }
  }

  async onClose(
    _connection: Connection,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    await this.flushPersist();
  }

  // ── AgentWorkflow callbacks ───────────────────────────────────────────

  async onWorkflowProgress(
    _workflowName: string,
    _workflowId: string,
    progress: unknown
  ): Promise<void> {
    await this.routeExecutionUpdate(progress as WorkflowExecution);
  }

  async onWorkflowComplete(
    _workflowName: string,
    workflowId: string,
    result?: unknown
  ): Promise<void> {
    const execution = result as WorkflowExecution | undefined;
    await this.routeExecutionUpdate(
      execution ?? {
        id: workflowId,
        workflowId: this.workflowState?.id || "",
        status: "completed",
        nodeExecutions: [],
      }
    );
  }

  async onWorkflowError(
    _workflowName: string,
    workflowId: string,
    error: string
  ): Promise<void> {
    await this.routeExecutionUpdate({
      id: workflowId,
      workflowId: this.workflowState?.id || "",
      status: "error",
      nodeExecutions: [],
      error,
    });
  }

  // ── State loading ─────────────────────────────────────────────────────

  private setApiHost(apiHost: string): void {
    this.setState({ ...this.state, apiHost });
  }

  /**
   * Ensures workflow state is loaded. If the DO woke from hibernation and
   * in-memory state was lost, attempts to reload from the database using
   * the persisted Agent state.
   */
  private async requireInitialized(): Promise<void> {
    if (this.workflowState) return;

    const { workflowId, userId } = this.state ?? {};
    if (!workflowId || !userId) {
      throw new Error("Session state lost. Please refresh the page.");
    }

    // DO woke from hibernation — reload state from database
    if (await this.tryLoadState(workflowId, userId)) return;

    throw new Error("Failed to reload workflow state after hibernation.");
  }

  /**
   * Attempt to load workflow state. First tries Agent state (hibernation
   * recovery), then falls back to loading from D1. Returns false only if
   * both paths fail.
   */
  private async tryLoadState(
    workflowId: string,
    userId: string
  ): Promise<boolean> {
    // Fast path: already loaded in memory
    if (this.workflowState) return true;

    // Try recovering from Agent state (hibernation wake)
    const { workflowId: savedId, userId: savedUser } = this.state ?? {};
    if (savedId && savedUser) {
      try {
        await this.loadFromDatabase(savedId, savedUser);
        return true;
      } catch {
        // Fall through to explicit params
      }
    }

    // Load from caller-provided params
    try {
      await this.loadFromDatabase(workflowId, userId);
      return true;
    } catch (error) {
      console.error("Error loading workflow:", error);
      return false;
    }
  }

  private async loadFromDatabase(
    workflowId: string,
    userId: string
  ): Promise<void> {
    const workflowStore = new WorkflowStore(this.env);
    const result = await workflowStore.getWithUserAccess(workflowId, userId);

    if (!result) {
      throw new Error(
        `User ${userId} does not have access to workflow ${workflowId}`
      );
    }

    const { workflow, organizationId } = result;

    const workflowWithData = await workflowStore.getWithData(
      workflowId,
      organizationId
    );
    const workflowData = workflowWithData?.data || {
      id: workflowId,
      name: workflow.name,
      description: workflow.description ?? undefined,
      trigger: workflow.trigger,
      runtime: workflow.runtime,
      nodes: [],
      edges: [],
    };

    this.setWorkflowStateFrom(
      workflowId,
      workflowData,
      workflow.updatedAt?.getTime() || Date.now()
    );

    this.organizationId = organizationId;

    this.setState({ ...this.state, workflowId, userId });
  }

  // ── Message handling ──────────────────────────────────────────────────

  private parseMessage(message: string): ClientMessage | null {
    try {
      return JSON.parse(message) as ClientMessage;
    } catch {
      return null;
    }
  }

  private async handleUpdateMessage(
    connection: Connection,
    message: WorkflowUpdateMessage
  ): Promise<void> {
    if (!this.workflowState) return;
    if (message.state.id !== this.workflowState.id) return;
    if (!message.state.name || !message.state.trigger) return;
    if (
      !Array.isArray(message.state.nodes) ||
      !Array.isArray(message.state.edges)
    )
      return;

    const nodeIds = new Set(message.state.nodes.map((node) => node.id));
    const filteredEdges = message.state.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    this.workflowState = { ...message.state, edges: filteredEdges };
    await this.schedulePersist();

    this.broadcastWorkflowState([connection.id]);
  }

  private async handleExecuteMessage(
    connection: Connection,
    message: WorkflowExecuteMessage
  ): Promise<void> {
    if (message.executionId) {
      await this.subscribeToExecution(connection, message.executionId);
    } else {
      await this.startExecution(connection, message.parameters);
    }
  }

  private async subscribeToExecution(
    connection: Connection,
    executionId: string
  ): Promise<void> {
    this.tagExecution(connection, executionId);

    // Check DO storage for a buffered execution update
    const key = WorkflowAgent.STORAGE_PREFIX_EXEC_BUFFER + executionId;
    const buffered = await this.storage.get<BufferedExecution>(key);
    if (buffered) {
      if (
        this.workflowState &&
        buffered.execution.workflowId !== this.workflowState.id
      ) {
        return;
      }
      // Only delete buffer after a successful send
      if (this.trySendExecutionUpdate(connection, buffered.execution)) {
        await this.storage.delete(key);
      }
    }
  }

  private async startExecution(
    connection: Connection,
    parameters?: Record<string, unknown>
  ): Promise<void> {
    if (!this.workflowState || !this.organizationId) {
      connection.close(1011, "Workflow not initialized");
      return;
    }

    const userId = this.state?.userId;
    if (!userId) {
      connection.close(1011, "User not identified");
      return;
    }

    if (!this.executionManager) {
      this.executionManager = new ExecutionManager({ env: this.env });
    }

    try {
      const { executionId, execution } =
        await this.executionManager.executeWorkflow(
          this.workflowState,
          this.organizationId,
          userId,
          parameters
        );

      this.tagExecution(connection, executionId);
      this.sendExecutionUpdate(connection, execution);
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      this.sendExecutionUpdate(connection, {
        id: "",
        workflowId: this.workflowState.id,
        status: "error",
        nodeExecutions: [],
        error:
          error instanceof Error ? error.message : "Failed to execute workflow",
      });
    }
  }

  // ── Execution updates ─────────────────────────────────────────────────

  /**
   * Route an execution update to the subscribed connection.
   *
   * Finds the connection by scanning live connections whose persisted state
   * matches the execution ID. Connection state survives DO hibernation, so
   * this works reliably even after the DO wakes from sleep.
   *
   * If no connection is subscribed, buffers the update in DO transactional
   * storage so a late-subscribing client can pick it up.
   */
  private async routeExecutionUpdate(
    execution: WorkflowExecution
  ): Promise<void> {
    // Extract and store form schemas from node outputs
    await this.extractFormSchemas(execution);

    const conn = this.findConnectionByExecutionId(execution.id);
    if (conn) {
      this.sendExecutionUpdate(conn, execution);
      return;
    }

    // No connection subscribed — buffer in DO storage
    await this.storage.put(
      WorkflowAgent.STORAGE_PREFIX_EXEC_BUFFER + execution.id,
      { execution, bufferedAt: Date.now() } satisfies BufferedExecution
    );
  }

  /**
   * Scan node outputs for form schema data (`schema` + `token`) and
   * store them in DO transactional storage. This is how form nodes
   * register their field definitions without touching the main DB.
   *
   * Also picks up `feedbackFormConfig` from create-feedback-form nodes
   * so the public feedback page can read title/description by token.
   */
  private async extractFormSchemas(
    execution: WorkflowExecution
  ): Promise<void> {
    for (const nodeExec of execution.nodeExecutions) {
      if (nodeExec.status !== "completed" || !nodeExec.outputs) continue;

      const token = nodeExec.outputs.token;
      if (typeof token !== "string") continue;

      if (typeof nodeExec.outputs.schema === "string") {
        const key = WorkflowAgent.STORAGE_PREFIX_FORM + token + ":schema";
        const existing = await this.storage.get(key);
        if (!existing) {
          await this.storage.put(key, nodeExec.outputs.schema);
          // Persist the org so the public form route can scope R2 uploads
          // even when this DO is woken cold (in-memory org would be null).
          if (this.organizationId) {
            await this.storage.put(
              key.replace(":schema", ":org"),
              this.organizationId
            );
          }
        }
      }

      if (typeof nodeExec.outputs.feedbackFormConfig === "string") {
        const key =
          WorkflowAgent.STORAGE_PREFIX_FEEDBACK_FORM + token + ":config";
        const existing = await this.storage.get(key);
        if (!existing) {
          await this.storage.put(key, nodeExec.outputs.feedbackFormConfig);
        }
      }
    }
  }

  /**
   * Scan live connections for one subscribed to the given execution.
   * Connection state (`connection.setState`) survives DO hibernation via
   * WebSocket attachments, making this the reliable lookup path.
   */
  private findConnectionByExecutionId(
    executionId: string
  ): Connection | undefined {
    for (const conn of this.hiddenMethods.getConnections()) {
      const state = conn.state as { executionId?: string } | undefined;
      if (state?.executionId === executionId) {
        return conn;
      }
    }
    return undefined;
  }

  private sendExecutionUpdate(
    connection: Connection,
    execution: WorkflowExecution
  ): void {
    this.trySendExecutionUpdate(connection, execution);
  }

  /** Send an execution update, returning true on success. */
  private trySendExecutionUpdate(
    connection: Connection,
    execution: WorkflowExecution
  ): boolean {
    const message: WorkflowExecutionUpdateMessage = {
      type: "execution_update",
      executionId: execution.id,
      status: execution.status,
      nodeExecutions: execution.nodeExecutions,
      error: execution.error,
    };
    try {
      connection.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Error sending execution update:", error);
      return false;
    }
  }

  // ── Form state ────────────────────────────────────────────────────────

  /**
   * Check if a form has already been submitted.
   * Returns `{ submitted: boolean }`.
   */
  async getFormStatus(
    token: string
  ): Promise<{ submitted: boolean; schema?: string; organizationId?: string }> {
    const key = WorkflowAgent.STORAGE_PREFIX_FORM + token;
    const record = await this.storage.get<{ submitted: boolean }>(key);
    const schema = await this.storage.get<string>(key + ":schema");
    const organizationId =
      (await this.storage.get<string>(key + ":org")) ??
      this.organizationId ??
      undefined;
    return {
      submitted: record?.submitted ?? false,
      ...(schema ? { schema } : {}),
      ...(organizationId ? { organizationId } : {}),
    };
  }

  /**
   * Atomically check-and-submit a form response.
   * Rejects duplicate submissions. On success, sends the event to the
   * EXECUTE workflow instance to resume the paused node.
   */
  async checkAndSubmitForm(
    token: string,
    executionId: string,
    response: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    const key = WorkflowAgent.STORAGE_PREFIX_FORM + token;
    const existing = await this.storage.get<{ submitted: boolean }>(key);

    if (existing?.submitted) {
      return { success: false, error: "Form has already been submitted" };
    }

    // Mark as submitted before sending event (fail-safe: prevents double-submit
    // even if the event send fails)
    await this.storage.put(key, { submitted: true, submittedAt: Date.now() });

    try {
      const instance = await this.env.EXECUTE.get(executionId);
      await instance.sendEvent({
        type: `form-response-${token}`,
        payload: {
          outputs: { response },
          usage: 0,
        },
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send form event:", error);
      return {
        success: false,
        error: "Failed to resume workflow. The execution may have expired.",
      };
    }
  }

  // ── Feedback form state ───────────────────────────────────────────────

  async getFeedbackFormStatus(
    token: string
  ): Promise<{ submitted: boolean; config?: string }> {
    const key = WorkflowAgent.STORAGE_PREFIX_FEEDBACK_FORM + token;
    const [record, config] = await Promise.all([
      this.storage.get<{ submitted: boolean }>(key),
      this.storage.get<string>(key + ":config"),
    ]);
    return {
      submitted: record?.submitted ?? false,
      ...(config ? { config } : {}),
    };
  }

  /**
   * Unlike `checkAndSubmitForm`, this does not send any workflow event —
   * feedback submission is decoupled from workflow execution.
   */
  async markFeedbackSubmitted(
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    const key = WorkflowAgent.STORAGE_PREFIX_FEEDBACK_FORM + token;
    const existing = await this.storage.get<{ submitted: boolean }>(key);

    if (existing?.submitted) {
      return { success: false, error: "Feedback has already been submitted" };
    }

    await this.storage.put(key, { submitted: true, submittedAt: Date.now() });
    return { success: true };
  }

  // ── Persistence ───────────────────────────────────────────────────────

  /**
   * Schedule a debounced persist to D1/R2 via the Agent SDK schedule system.
   *
   * Stores a snapshot of the current workflow state in DO transactional
   * storage (survives hibernation), then creates a 500ms delayed schedule.
   * Any previously scheduled persist is cancelled first so rapid edits
   * don't accumulate schedule rows — only the latest snapshot is persisted.
   */
  private async schedulePersist(): Promise<void> {
    if (!this.workflowState || !this.organizationId) return;

    await this.storage.put(WorkflowAgent.STORAGE_KEY_DIRTY, {
      workflowState: this.workflowState,
      organizationId: this.organizationId,
      apiHost: this.state?.apiHost,
    } satisfies PendingPersist);

    // Cancel any existing persist schedule to debounce
    this.cancelPersistSchedules();

    await this.hiddenMethods.schedule(
      WorkflowAgent.PERSIST_DEBOUNCE_MS / 1000,
      "persistCallback"
    );
  }

  /** Called by the Agent SDK schedule system when the delayed persist fires. */
  async persistCallback(): Promise<void> {
    const pending = await this.storage.get<PendingPersist>(
      WorkflowAgent.STORAGE_KEY_DIRTY
    );
    if (!pending) return;

    await this.storage.delete(WorkflowAgent.STORAGE_KEY_DIRTY);
    await this.persistToDatabaseFrom(pending);
  }

  /**
   * Persist workflow state from an explicit snapshot. Does not depend on
   * in-memory fields, so it works correctly when called from the alarm
   * handler after hibernation wake.
   */
  private async persistToDatabaseFrom(pending: PendingPersist): Promise<void> {
    try {
      const workflowStore = new WorkflowStore(this.env);

      const workflowData = {
        id: pending.workflowState.id,
        name: pending.workflowState.name,
        description: pending.workflowState.description,
        trigger: pending.workflowState.trigger,
        runtime: pending.workflowState.runtime,
        organizationId: pending.organizationId,
        nodes: pending.workflowState.nodes,
        edges: pending.workflowState.edges,
        ...(pending.apiHost ? { apiHost: pending.apiHost } : {}),
      };

      await Promise.all([
        workflowStore.update(pending.workflowState.id, pending.organizationId, {
          name: pending.workflowState.name,
          description: pending.workflowState.description ?? null,
          trigger: pending.workflowState.trigger,
          runtime: pending.workflowState.runtime,
        }),
        workflowStore.save(workflowData as SaveWorkflowRecord),
      ]);
    } catch (error) {
      console.error("Error persisting workflow:", error);
    }
  }

  /** Cancel all pending persistCallback schedules. */
  private cancelPersistSchedules(): void {
    this.cancelSchedulesFor("persistCallback");
  }

  /** Cancel every pending schedule for one callback name. */
  private cancelSchedulesFor(callback: string): void {
    for (const s of this.hiddenMethods.getSchedules()) {
      if (s.callback === callback) {
        // cancelSchedule is async but we fire-and-forget here —
        // the callbacks are idempotent, so stale schedules are harmless.
        void this.hiddenMethods.cancelSchedule(s.id);
      }
    }
  }

  /**
   * Immediately persist any pending state and cancel scheduled callbacks.
   * Called on connection close to ensure the last edit is never lost.
   */
  private async flushPersist(): Promise<void> {
    const pending = await this.storage.get<PendingPersist>(
      WorkflowAgent.STORAGE_KEY_DIRTY
    );
    if (!pending) return;

    this.cancelPersistSchedules();
    await this.storage.delete(WorkflowAgent.STORAGE_KEY_DIRTY);
    await this.persistToDatabaseFrom(pending);
  }
}
