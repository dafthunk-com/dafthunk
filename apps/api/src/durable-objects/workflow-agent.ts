/**
 * WorkflowAgent Durable Object
 *
 * Manages workflow state synchronization, WebSocket connections, and execution
 * triggering. Receives execution updates via HTTP POST from the monitoring service.
 *
 * Uses the standard DurableObject Hibernation API for WebSocket handling,
 * keeping the same protocol as the old Session DO for frontend compatibility.
 */

import { DurableObject } from "cloudflare:workers";
import type {
  ClientMessage,
  WorkflowExecuteMessage,
  WorkflowExecution,
  WorkflowExecutionUpdateMessage,
  WorkflowInitMessage,
  WorkflowState,
  WorkflowUpdateMessage,
} from "@dafthunk/types";

import type { Bindings } from "../context";
import { ExecutionManager } from "../services/execution-manager";
import type { SaveWorkflowRecord } from "../stores/workflow-store";
import { WorkflowStore } from "../stores/workflow-store";

// ── Execution tracking ──────────────────────────────────────────────────

interface ExecutionTracking {
  ws: WebSocket;
  execution: WorkflowExecution | null;
}

// ── WorkflowAgent ───────────────────────────────────────────────────────

export class WorkflowAgent extends DurableObject<Bindings> {
  private static readonly PERSIST_DEBOUNCE_MS = 500;

  private executionManager: ExecutionManager;

  // In-memory state (loaded from D1/R2, persisted on changes)
  private workflowState: WorkflowState | null = null;
  private organizationId: string | null = null;
  private userId: string | null = null;
  private apiHost: string | null = null;

  // Connection & execution tracking (rebuilt after hibernation)
  private connections = new Map<WebSocket, ExecutionTracking>();
  private executionIndex = new Map<string, ExecutionTracking>();
  private executionBuffer = new Map<
    string,
    { execution: WorkflowExecution; bufferedAt: number }
  >();
  private pendingPersistTimeout: number | undefined = undefined;
  private persistInFlight = false;
  private persistInFlightPromise: Promise<void> | null = null;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    this.executionManager = new ExecutionManager({ env });

    // Recover WebSocket connections after hibernation
    const websockets = this.ctx.getWebSockets();
    this.recoverConnections(websockets);
  }

  // ── HTTP fetch handler ──────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Internal endpoint for execution updates from Runtime (no auth needed)
    if (url.pathname.endsWith("/execution") && request.method === "POST") {
      return this.handleExecutionUpdate(request);
    }

    // Capture API host
    this.setApiHost(url.origin);

    // Auth extraction
    const pathParts = url.pathname.split("/").filter(Boolean);
    const workflowId = pathParts[pathParts.length - 1] || "";
    const userId = request.headers.get("X-User-Id") || "";

    if (!workflowId) {
      return new Response("Missing workflowId in path", { status: 400 });
    }
    if (!userId) {
      return new Response("Missing userId header", { status: 401 });
    }

    // Ensure state is loaded
    const stateResult = await this.ensureState(workflowId, userId);
    if (!stateResult.success) {
      return stateResult.response;
    }

    // State GET endpoint
    if (url.pathname.endsWith("/state") && request.method === "GET") {
      return Response.json(this.workflowState);
    }

    // WebSocket upgrade
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      await this.storeRecoveryData();
      return this.handleWebSocketUpgrade();
    }

    return new Response("Expected /state GET or WebSocket upgrade", {
      status: 400,
    });
  }

  // ── Execution update endpoint (HTTP, called by CloudflareMonitoringService) ──

  private async handleExecutionUpdate(request: Request): Promise<Response> {
    try {
      const execution = (await request.json()) as WorkflowExecution;
      this.broadcastExecutionUpdate(execution);
      return Response.json({ ok: true });
    } catch (error) {
      console.error("Error handling execution update:", error);
      return Response.json(
        {
          error: "Failed to handle execution update",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  // ── WebSocket handling (Hibernation API) ────────────────────────────

  private handleWebSocketUpgrade(): Response {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);
    this.connections.set(server, { ws: server, execution: null });

    if (this.workflowState) {
      const initMessage: WorkflowInitMessage = {
        type: "init",
        state: this.workflowState,
      };
      server.send(JSON.stringify(initMessage));
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      await this.ensureInitialized();

      if (typeof message !== "string") {
        ws.close(1003, "Binary messages not supported");
        return;
      }

      const parsed = this.parseMessage(message);
      if (!parsed || !("type" in parsed)) {
        ws.close(1003, "Invalid message format");
        return;
      }

      switch (parsed.type) {
        case "update":
          this.handleUpdateMessage(ws, parsed as WorkflowUpdateMessage);
          break;
        case "execute":
          await this.handleExecuteMessage(ws, parsed as WorkflowExecuteMessage);
          break;
        default:
          ws.close(1003, "Unknown message type");
          break;
      }
    } catch (error) {
      console.error("Failed to process message:", error);
      ws.close(1011, "Message processing failed");
    }
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ) {
    const tracking = this.connections.get(ws);
    if (tracking?.execution) {
      this.executionIndex.delete(tracking.execution.id);
    }
    this.connections.delete(ws);
    await this.flushPersist();
  }

  // ── Connection recovery ─────────────────────────────────────────────

  private recoverConnections(websockets: WebSocket[]): void {
    for (const ws of websockets) {
      const attachment = ws.deserializeAttachment();
      const executionId =
        attachment &&
        typeof attachment === "object" &&
        "executionId" in attachment &&
        typeof attachment.executionId === "string"
          ? attachment.executionId
          : null;

      const execution: WorkflowExecution | null = executionId
        ? {
            id: executionId,
            workflowId: "",
            status: "executing",
            nodeExecutions: [],
          }
        : null;

      const tracking: ExecutionTracking = { ws, execution };
      this.connections.set(ws, tracking);

      if (executionId && execution) {
        this.executionIndex.set(executionId, tracking);
      }
    }
  }

  // ── State management ────────────────────────────────────────────────

  private setApiHost(apiHost: string): void {
    this.apiHost = apiHost;
    this.ctx.storage.put("apiHost", apiHost);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.workflowState) {
      return;
    }

    const [workflowId, userId, apiHost] = await Promise.all([
      this.ctx.storage.get<string>("workflowId"),
      this.ctx.storage.get<string>("userId"),
      this.ctx.storage.get<string>("apiHost"),
    ]);

    if (apiHost) {
      this.apiHost = apiHost;
    }

    if (!workflowId || !userId) {
      throw new Error("Session state lost. Please refresh the page.");
    }

    await this.loadState(workflowId, userId);
  }

  private async ensureState(
    workflowId: string,
    userId: string
  ): Promise<{ success: true } | { success: false; response: Response }> {
    // Try to recover from hibernation
    try {
      await this.ensureInitialized();
      return { success: true };
    } catch {
      // Recovery failed, load from database
    }

    try {
      await this.loadState(workflowId, userId);
      return { success: true };
    } catch (error) {
      console.error("Error loading workflow:", error);
      return {
        success: false,
        response: Response.json(
          {
            error: "Failed to load workflow",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 403 }
        ),
      };
    }
  }

  private async loadState(workflowId: string, userId: string): Promise<void> {
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
    this.userId = userId;

    // Persist recovery data so ensureInitialized works after hibernation
    await this.storeRecoveryData();
  }

  private async storeRecoveryData(): Promise<void> {
    if (this.workflowState && this.userId) {
      await Promise.all([
        this.ctx.storage.put("workflowId", this.workflowState.id),
        this.ctx.storage.put("userId", this.userId),
      ]);
    }
  }

  // ── Message handling ────────────────────────────────────────────────

  private parseMessage(message: string): ClientMessage | null {
    try {
      return JSON.parse(message) as ClientMessage;
    } catch {
      return null;
    }
  }

  private handleUpdateMessage(
    ws: WebSocket,
    message: WorkflowUpdateMessage
  ): void {
    if (!this.workflowState) {
      console.error("Invalid state update: workflow not loaded");
      return;
    }

    if (message.state.id !== this.workflowState.id) {
      console.error("Invalid state update: workflow ID mismatch");
      return;
    }

    if (!message.state.name || !message.state.trigger) {
      console.error("Invalid state update: missing required fields");
      return;
    }

    if (
      !Array.isArray(message.state.nodes) ||
      !Array.isArray(message.state.edges)
    ) {
      console.error("Invalid state update: nodes and edges must be arrays");
      return;
    }

    // Filter out orphaned edges
    const nodeIds = new Set(message.state.nodes.map((node) => node.id));
    const filteredEdges = message.state.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    this.workflowState = {
      ...message.state,
      edges: filteredEdges,
    };

    this.schedulePersist();

    // Broadcast to other clients
    const updateMsg: WorkflowUpdateMessage = {
      type: "update",
      state: this.workflowState,
    };
    const serialized = JSON.stringify(updateMsg);
    for (const tracking of this.connections.values()) {
      if (tracking.ws !== ws) {
        try {
          tracking.ws.send(serialized);
        } catch (error) {
          console.error("Error sending to WebSocket:", error);
        }
      }
    }
  }

  private async handleExecuteMessage(
    ws: WebSocket,
    message: WorkflowExecuteMessage
  ): Promise<void> {
    if (message.executionId) {
      // Validate execution belongs to this workflow before subscribing.
      // Buffered executions carry workflowId — check if it matches.
      const buffered = this.executionBuffer.get(message.executionId);
      if (
        buffered &&
        this.workflowState &&
        buffered.execution.workflowId !== this.workflowState.id
      ) {
        return;
      }

      // Register for existing execution updates
      const tracking = this.connections.get(ws);
      if (tracking) {
        this.executionIndex.set(message.executionId, tracking);
        ws.serializeAttachment({ executionId: message.executionId });

        // Send buffered updates
        if (buffered) {
          tracking.execution = buffered.execution;
          this.sendExecutionUpdate(ws, buffered.execution);
          this.executionBuffer.delete(message.executionId);
        }
      }
    } else {
      await this.handleExecuteWorkflow(ws, message.parameters);
    }
  }

  private async handleExecuteWorkflow(
    ws: WebSocket,
    parameters?: Record<string, unknown>
  ): Promise<void> {
    if (!this.workflowState || !this.organizationId || !this.userId) {
      ws.close(1011, "Workflow not initialized");
      return;
    }

    try {
      const { executionId, execution } =
        await this.executionManager.executeWorkflow(
          this.workflowState,
          this.organizationId,
          this.userId,
          parameters
        );

      // Register for updates
      const tracking = this.connections.get(ws);
      if (tracking) {
        this.executionIndex.set(executionId, tracking);
        tracking.execution = execution;
        ws.serializeAttachment({ executionId });
      }

      this.sendExecutionUpdate(ws, execution);
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      this.sendExecutionError(
        ws,
        error instanceof Error ? error.message : "Failed to execute workflow"
      );
    }
  }

  // ── Execution broadcasting ──────────────────────────────────────────

  private broadcastExecutionUpdate(execution: WorkflowExecution): void {
    const tracking = this.executionIndex.get(execution.id);
    if (tracking) {
      tracking.execution = execution;
      this.sendExecutionUpdate(tracking.ws, execution);
    } else {
      // Buffer latest state for when WebSocket connects. Only the most recent
      // update is kept per execution — intermediate updates are overwritten.
      // The frontend reconstructs node state from the final execution record.
      this.cleanExpiredBuffers();
      this.executionBuffer.set(execution.id, {
        execution,
        bufferedAt: Date.now(),
      });
    }
  }

  private sendExecutionUpdate(
    ws: WebSocket,
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
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending execution update:", error);
    }
  }

  private sendExecutionError(ws: WebSocket, errorMessage: string): void {
    const message: WorkflowExecutionUpdateMessage = {
      type: "execution_update",
      executionId: "",
      status: "error",
      nodeExecutions: [],
      error: errorMessage,
    };
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending execution error:", error);
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

  // ── Persistence ─────────────────────────────────────────────────────

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
    if (!this.workflowState || !this.organizationId) {
      return;
    }

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
        ...(this.apiHost ? { apiHost: this.apiHost } : {}),
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
    // Wait for any in-flight persist to finish before doing a final persist
    if (this.persistInFlightPromise) {
      await this.persistInFlightPromise;
    }
    await this.persistToDatabase();
  }
}
