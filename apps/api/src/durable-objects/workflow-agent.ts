/**
 * WorkflowAgent Durable Object
 *
 * Manages workflow state synchronization, WebSocket connections, and execution
 * triggering. Extends the Cloudflare Agents SDK `Agent` base class for built-in
 * WebSocket management and workflow orchestration via AgentWorkflow callbacks.
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
  runWorkflow(
    workflowName: string,
    params: RuntimeParams,
    options?: { id?: string }
  ): Promise<string>;
  terminateWorkflow(workflowId: string): Promise<void>;
}

// ── Types ────────────────────────────────────────────────────────────────

interface WorkflowAgentState {
  workflowId?: string;
  userId?: string;
  apiHost?: string;
}

interface ExecutionTracking {
  connectionId: string;
  execution: WorkflowExecution | null;
}

// ── WorkflowAgent ────────────────────────────────────────────────────────

export class WorkflowAgent extends Agent<Bindings, WorkflowAgentState> {
  private static readonly PERSIST_DEBOUNCE_MS = 500;

  initialState: WorkflowAgentState = {};

  private executionManager: ExecutionManager | null = null;
  private workflowState: WorkflowState | null = null;
  private organizationId: string | null = null;

  private executionIndex = new Map<string, ExecutionTracking>();
  private executionBuffer = new Map<
    string,
    { execution: WorkflowExecution; bufferedAt: number }
  >();
  private pendingPersistTimeout: number | undefined = undefined;
  private persistInFlight = false;
  private persistInFlightPromise: Promise<void> | null = null;

  // ── Agent SDK method wrappers ─────────────────────────────────────────
  // Each wraps the cast once. Call sites use these instead of agentSelf().

  private get hiddenMethods(): HiddenAgentMethods {
    return this as unknown as HiddenAgentMethods;
  }

  private broadcastMessage(msg: string, exclude?: string[]): void {
    this.hiddenMethods.broadcast(msg, exclude);
  }

  private findConnection(id: string): Connection | undefined {
    return this.hiddenMethods.getConnection(id);
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
      this.requireInitialized();

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
          this.handleUpdateMessage(connection, parsed as WorkflowUpdateMessage);
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
    connection: Connection,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    for (const [executionId, tracking] of this.executionIndex) {
      if (tracking.connectionId === connection.id) {
        this.executionIndex.delete(executionId);
      }
    }
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
    this.routeExecutionUpdate(progress as WorkflowExecution);
  }

  async onWorkflowComplete(
    _workflowName: string,
    workflowId: string,
    result?: unknown
  ): Promise<void> {
    const execution = result as WorkflowExecution | undefined;
    this.routeExecutionUpdate(
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
    this.routeExecutionUpdate({
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
   * Throws if workflow state is not loaded. Used by onMessage which always
   * runs after onConnect has loaded state — failure here means the DO
   * woke from hibernation and Agent state was lost.
   */
  private requireInitialized(): void {
    if (this.workflowState) return;

    const { workflowId, userId } = this.state ?? {};
    if (!workflowId || !userId) {
      throw new Error("Session state lost. Please refresh the page.");
    }
    // State exists in Agent storage but not loaded into memory yet.
    // This shouldn't happen in practice since onConnect always loads first,
    // but if it does, the throw above gives a clear error.
    throw new Error("Workflow state not loaded. Reconnect to reload.");
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

  private handleUpdateMessage(
    connection: Connection,
    message: WorkflowUpdateMessage
  ): void {
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
    this.schedulePersist();

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
      this.subscribeToExecution(connection, message.executionId);
    } else {
      await this.startExecution(connection, message.parameters);
    }
  }

  private subscribeToExecution(
    connection: Connection,
    executionId: string
  ): void {
    const buffered = this.executionBuffer.get(executionId);
    if (
      buffered &&
      this.workflowState &&
      buffered.execution.workflowId !== this.workflowState.id
    ) {
      return;
    }

    const tracking: ExecutionTracking = {
      connectionId: connection.id,
      execution: null,
    };
    this.executionIndex.set(executionId, tracking);
    connection.setState({ executionId });

    if (buffered) {
      tracking.execution = buffered.execution;
      this.sendExecutionUpdate(connection, buffered.execution);
      this.executionBuffer.delete(executionId);
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

      this.executionIndex.set(executionId, {
        connectionId: connection.id,
        execution,
      });
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
   * Route an execution update to the subscribed connection, or buffer it
   * if no connection is subscribed yet.
   */
  private routeExecutionUpdate(execution: WorkflowExecution): void {
    const tracking = this.executionIndex.get(execution.id);
    if (tracking) {
      tracking.execution = execution;
      const conn = this.findConnection(tracking.connectionId);
      if (conn) {
        this.sendExecutionUpdate(conn, execution);
      }
    } else {
      this.cleanExpiredBuffers();
      this.executionBuffer.set(execution.id, {
        execution,
        bufferedAt: Date.now(),
      });
    }
  }

  private sendExecutionUpdate(
    connection: Connection,
    execution: WorkflowExecution
  ): void {
    const message: WorkflowExecutionUpdateMessage = {
      type: "execution_update",
      executionId: execution.id,
      status: execution.status,
      nodeExecutions: execution.nodeExecutions,
      error: execution.error,
    };
    try {
      connection.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending execution update:", error);
    }
  }

  private cleanExpiredBuffers(): void {
    const now = Date.now();
    for (const [id, entry] of this.executionBuffer) {
      if (now - entry.bufferedAt > 60_000) {
        this.executionBuffer.delete(id);
      }
    }
  }

  // ── Persistence ───────────────────────────────────────────────────────

  private schedulePersist(): void {
    if (this.pendingPersistTimeout !== undefined) {
      clearTimeout(this.pendingPersistTimeout);
    }

    this.pendingPersistTimeout = setTimeout(() => {
      this.pendingPersistTimeout = undefined;
      if (this.persistInFlight) {
        this.schedulePersist();
        return;
      }
      this.persistInFlight = true;
      this.persistInFlightPromise = this.persistToDatabase().finally(() => {
        this.persistInFlight = false;
        this.persistInFlightPromise = null;
      });
    }, WorkflowAgent.PERSIST_DEBOUNCE_MS) as unknown as number;
  }

  private async persistToDatabase(): Promise<void> {
    if (!this.workflowState || !this.organizationId) return;

    try {
      const workflowStore = new WorkflowStore(this.env);

      const workflowData = {
        id: this.workflowState.id,
        name: this.workflowState.name,
        trigger: this.workflowState.trigger,
        runtime: this.workflowState.runtime,
        organizationId: this.organizationId,
        nodes: this.workflowState.nodes,
        edges: this.workflowState.edges,
        ...(this.state?.apiHost ? { apiHost: this.state.apiHost } : {}),
      };

      await Promise.all([
        workflowStore.update(this.workflowState.id, this.organizationId, {
          name: this.workflowState.name,
          trigger: this.workflowState.trigger,
        }),
        workflowStore.save(workflowData as SaveWorkflowRecord),
      ]);
    } catch (error) {
      console.error("Error persisting workflow:", error);
    }
  }

  private async flushPersist(): Promise<void> {
    if (this.pendingPersistTimeout !== undefined) {
      clearTimeout(this.pendingPersistTimeout);
      this.pendingPersistTimeout = undefined;
    }
    if (this.persistInFlightPromise) {
      await this.persistInFlightPromise;
    }
    await this.persistToDatabase();
  }
}
