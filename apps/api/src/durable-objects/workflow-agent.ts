/**
 * WorkflowAgent Durable Object
 *
 * Manages workflow state synchronization, WebSocket connections, and execution
 * triggering. Extends the Cloudflare Agents SDK `Agent` base class for built-in
 * WebSocket management and workflow orchestration via AgentWorkflow callbacks.
 *
 * ## Hibernation Safety
 *
 * This DO uses WebSocket hibernation (Agent SDK default). All in-memory fields
 * are lost when the DO hibernates. The design ensures correctness by storing
 * critical state in persistent mechanisms:
 *
 * - **Agent state** (`this.state`): workflowId, userId, apiHost
 * - **Connection state** (`connection.setState`): executionId per connection
 * - **DO storage** (`this.storage`): pending persist snapshots, execution buffers
 * - **Agent SDK schedules**: debounced persistence timer
 *
 * In-memory fields (`workflowState`, `organizationId`, `executionManager`) are
 * caches, reconstructed on demand after hibernation wake.
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

import type { Bindings } from "../context";
import { ExecutionManager } from "../services/execution-manager";
import type { SaveWorkflowRecord } from "../stores/workflow-store";
import { WorkflowStore } from "../stores/workflow-store";

// ── Agent SDK type shim ──────────────────────────────────────────────────
// The agents bundled d.ts doesn't resolve some inherited Agent/Server methods
// due to transitive partyserver type resolution issues. The methods exist at
// runtime. We define typed wrappers on the class to contain the cast in one
// place rather than scattering it across call sites.

interface HiddenAgentMethods {
  broadcast(msg: string, without?: string[]): void;
  getConnection(id: string): Connection | undefined;
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

interface WorkflowAgentState {
  workflowId?: string;
  userId?: string;
  apiHost?: string;
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
  private static readonly STORAGE_PREFIX_HITL = "hitl:";

  initialState: WorkflowAgentState = {};

  // In-memory caches — reconstructed on demand after hibernation wake.
  // Loss of these fields is harmless; they are never the source of truth.
  private executionManager: ExecutionManager | null = null;
  private workflowState: WorkflowState | null = null;
  private organizationId: string | null = null;

  // ── Agent SDK method wrappers ─────────────────────────────────────────
  // Each wraps the cast once. Call sites use these instead of agentSelf().

  private get hiddenMethods(): HiddenAgentMethods {
    return this as unknown as HiddenAgentMethods;
  }

  /** DO transactional storage — survives hibernation. */
  private get storage(): DurableObjectStorage {
    return (this as unknown as { ctx: DurableObjectState }).ctx.storage;
  }

  private broadcastMessage(msg: string, exclude?: string[]): void {
    this.hiddenMethods.broadcast(msg, exclude);
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
    const userId = ctx.request.headers.get("X-User-Id") || "";
    const workflowId =
      ctx.request.headers.get("x-partykit-room") ||
      new URL(ctx.request.url).pathname.split("/").pop() ||
      "";

    if (!workflowId || !userId) {
      connection.close(1008, "Missing workflowId or userId");
      return;
    }

    this.setApiHost(new URL(ctx.request.url).origin);

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

  // ── HTTP fetch ────────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/state") && request.method === "GET") {
      const pathParts = url.pathname.split("/").filter(Boolean);
      const workflowId = pathParts[pathParts.length - 2] || "";
      const userId = request.headers.get("X-User-Id") || "";

      if (workflowId && userId) {
        await this.tryLoadState(workflowId, userId);
      }
      return Response.json(this.workflowState);
    }

    // Delegate WebSocket upgrade and other requests to Agent SDK
    const superFetch = (
      super.fetch as (req: Request) => Promise<Response>
    ).bind(this);
    return superFetch(request);
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
      trigger: workflow.trigger,
      runtime: workflow.runtime,
      nodes: [],
      edges: [],
    };

    this.workflowState = {
      id: workflowId,
      name: workflowData.name,
      trigger: workflowData.trigger as WorkflowState["trigger"],
      runtime: workflowData.runtime,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
      timestamp: workflow.updatedAt?.getTime() || Date.now(),
    };

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

    const updateMsg: WorkflowUpdateMessage = {
      type: "update",
      state: this.workflowState,
    };
    this.broadcastMessage(JSON.stringify(updateMsg), [connection.id]);
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
    connection.setState({ executionId });

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

      connection.setState({ executionId });
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

  // ── HITL form state ───────────────────────────────────────────────────

  /**
   * Check if a HITL form has already been submitted.
   * Returns `{ submitted: boolean }`.
   */
  async getHitlFormStatus(token: string): Promise<{ submitted: boolean }> {
    const key = WorkflowAgent.STORAGE_PREFIX_HITL + token;
    const record = await this.storage.get<{ submitted: boolean }>(key);
    return { submitted: record?.submitted ?? false };
  }

  /**
   * Atomically check-and-submit a HITL form response.
   * Rejects duplicate submissions. On success, sends the event to the
   * EXECUTE workflow instance to resume the paused node.
   */
  async checkAndSubmitHitlForm(
    token: string,
    executionId: string,
    response: { text?: string; approved?: boolean; metadata?: Record<string, unknown> }
  ): Promise<{ success: boolean; error?: string }> {
    const key = WorkflowAgent.STORAGE_PREFIX_HITL + token;
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
        type: `hitl-response-${token}`,
        payload: {
          outputs: {
            response: response.text ?? "",
            approved: response.approved ?? false,
            metadata: response.metadata ?? {},
          },
          usage: 0,
        },
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send HITL event:", error);
      return {
        success: false,
        error: "Failed to resume workflow. The execution may have expired.",
      };
    }
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
          trigger: pending.workflowState.trigger,
        }),
        workflowStore.save(workflowData as SaveWorkflowRecord),
      ]);
    } catch (error) {
      console.error("Error persisting workflow:", error);
    }
  }

  /** Cancel all pending persistCallback schedules. */
  private cancelPersistSchedules(): void {
    for (const s of this.hiddenMethods.getSchedules()) {
      if (s.callback === "persistCallback") {
        // cancelSchedule is async but we fire-and-forget here —
        // the callback is idempotent, so stale schedules are harmless.
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
