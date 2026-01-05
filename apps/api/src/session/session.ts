/**
 * WorkflowSession Durable Object
 *
 * Manages workflow state synchronization and execution coordination via WebSocket.
 * Clients connect via WebSocket to sync state and receive realtime execution updates.
 */

import type {
  ClientMessage,
  WorkflowExecuteMessage,
  WorkflowExecution,
  WorkflowUpdateMessage,
} from "@dafthunk/types";
import { DurableObject } from "cloudflare:workers";

import type { Bindings } from "../context";
import { ConnectionManager } from "./connection-manager";
import { ExecutionManager } from "./execution-manager";
import { StateManager } from "./state-manager";

export class Session extends DurableObject<Bindings> {
  private static readonly PERSIST_DEBOUNCE_MS = 500;

  private stateManager: StateManager;
  private connectionManager: ConnectionManager;
  private executionManager: ExecutionManager;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);

    // Initialize managers
    this.stateManager = new StateManager({
      env,
      storage: this.ctx.storage,
      persistDebounceMs: Session.PERSIST_DEBOUNCE_MS,
    });

    this.connectionManager = new ConnectionManager();

    this.executionManager = new ExecutionManager({
      env,
    });

    // Recover WebSocket connections after hibernation
    const websockets = this.ctx.getWebSockets();
    this.connectionManager.recoverConnections(websockets);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Internal endpoint for execution updates from Cloudflare Workflows
    if (this.isExecutionUpdateRequest(url, request)) {
      return this.handleExecutionUpdate(request);
    }

    // All other endpoints require authentication and state
    const authResult = this.extractAuthParams(url, request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { workflowId, userId } = authResult;

    const stateResult = await this.ensureState(workflowId, userId);
    if (!stateResult.success) {
      return stateResult.response;
    }

    // Route to appropriate handler
    return this.routeRequest(url, request);
  }

  /**
   * Check if request is an execution update from Cloudflare Workflows
   */
  private isExecutionUpdateRequest(url: URL, request: Request): boolean {
    return url.pathname.endsWith("/execution") && request.method === "POST";
  }

  /**
   * Extract and validate authentication parameters
   */
  private extractAuthParams(
    url: URL,
    request: Request
  ):
    | { success: true; workflowId: string; userId: string }
    | { success: false; response: Response } {
    const pathParts = url.pathname.split("/").filter(Boolean);
    const workflowId = pathParts[pathParts.length - 1] || "";
    const userId = request.headers.get("X-User-Id") || "";

    if (!workflowId) {
      return {
        success: false,
        response: new Response("Missing workflowId in path", { status: 400 }),
      };
    }

    if (!userId) {
      return {
        success: false,
        response: new Response("Missing userId header", { status: 401 }),
      };
    }

    return { success: true, workflowId, userId };
  }

  /**
   * Ensure state is loaded, recovering or loading as needed
   */
  private async ensureState(
    workflowId: string,
    userId: string
  ): Promise<{ success: true } | { success: false; response: Response }> {
    // First, try to recover from hibernation
    try {
      await this.stateManager.ensureInitialized();
      return { success: true };
    } catch {
      // Recovery failed, try loading from parameters
    }

    // Check if state is already loaded
    try {
      this.stateManager.getState();
      return { success: true };
    } catch {
      // State not loaded, load it now
    }

    // Load state from database
    try {
      await this.stateManager.loadState(workflowId, userId);
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

  /**
   * Route request to appropriate handler
   */
  private async routeRequest(url: URL, request: Request): Promise<Response> {
    if (url.pathname.endsWith("/state") && request.method === "GET") {
      return this.handleStateRequest();
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    return new Response("Expected /state GET or WebSocket upgrade", {
      status: 400,
    });
  }

  private async handleStateRequest(): Promise<Response> {
    try {
      const state = this.stateManager.getState();
      return Response.json(state);
    } catch (error) {
      console.error("Error getting workflow state:", error);
      return Response.json(
        {
          error: "Failed to get workflow state",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  /**
   * Handle execution updates from Runtime (internal endpoint)
   */
  private async handleExecutionUpdate(request: Request): Promise<Response> {
    try {
      const execution = (await request.json()) as WorkflowExecution;

      const ws = this.connectionManager.getWebSocketForExecution(execution.id);
      if (!ws) {
        // Buffer for when WebSocket connects (synchronous workflows complete before WS connects)
        this.connectionManager.bufferExecution(execution.id, execution);
        return Response.json({ ok: true });
      }

      this.connectionManager.setExecution(ws, execution);

      const updateMessage =
        this.executionManager.createExecutionUpdateMessage(execution);
      this.connectionManager.send(ws, JSON.stringify(updateMessage));

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

  private async handleWebSocketUpgrade(_request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Store workflow ID and user ID in DO storage for recovery after DO restarts
    await this.stateManager.storeRecoveryData();

    this.ctx.acceptWebSocket(server);
    this.connectionManager.addConnection(server);

    const initState = this.stateManager.getState();
    this.connectionManager.sendInit(server, initState);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle WebSocket messages from client
   *
   * Message types:
   * - "update": Update workflow state (nodes/edges)
   * - "execute": Trigger workflow execution or register for updates
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      await this.stateManager.ensureInitialized();

      const parsed = this.parseMessage(message);
      if (!parsed || !("type" in parsed)) {
        // Protocol violation - close connection
        console.error("Protocol violation: Invalid message format");
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
          // Protocol violation - unknown message type
          console.error("Protocol violation: Unknown message type");
          ws.close(1003, "Unknown message type");
          break;
      }
    } catch (error) {
      // Protocol violation - message processing failed
      console.error("Protocol violation: Failed to process message:", error);
      ws.close(1011, "Message processing failed");
    }
  }

  /**
   * Parse and validate WebSocket message
   */
  private parseMessage(message: string | ArrayBuffer): ClientMessage | null {
    if (typeof message !== "string") {
      return null;
    }

    try {
      return JSON.parse(message) as ClientMessage;
    } catch {
      return null;
    }
  }

  /**
   * Handle workflow state update
   */
  private handleUpdateMessage(
    ws: WebSocket,
    message: WorkflowUpdateMessage
  ): void {
    this.stateManager.updateState(message.state);
    // Broadcast to all clients except the originating one
    this.connectionManager.broadcast(message.state, ws);
  }

  /**
   * Handle workflow execution request
   */
  private async handleExecuteMessage(
    ws: WebSocket,
    message: WorkflowExecuteMessage
  ): Promise<void> {
    if (message.executionId) {
      this.connectionManager.registerExecution(message.executionId, ws);
    } else {
      await this.handleExecuteWorkflow(ws, message.parameters);
    }
  }

  /**
   * Handle workflow execution triggered via WebSocket
   */
  private async handleExecuteWorkflow(
    ws: WebSocket,
    parameters?: Record<string, unknown>
  ): Promise<void> {
    const state = this.stateManager.getState();
    const organizationId = this.stateManager.getOrganizationId();
    const userId = this.stateManager.getUserId();

    if (!state || !organizationId || !userId) {
      // State not initialized - protocol violation
      console.error("Protocol violation: Workflow not initialized");
      ws.close(1011, "Workflow not initialized");
      return;
    }

    try {
      const { executionId, execution } =
        await this.executionManager.executeWorkflow(
          state,
          organizationId,
          userId,
          parameters
        );

      // Register this WebSocket for execution updates
      this.connectionManager.registerExecution(executionId, ws);

      // Store execution for this WebSocket
      this.connectionManager.setExecution(ws, execution);

      // Send execution started message
      const updateMessage =
        this.executionManager.createExecutionUpdateMessage(execution);
      this.connectionManager.send(ws, JSON.stringify(updateMessage));
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      // Can't start execution - close connection
      ws.close(1011, "Failed to execute workflow");
    }
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ) {
    this.connectionManager.removeConnection(ws);
    await this.stateManager.flushPersist();
  }
}
