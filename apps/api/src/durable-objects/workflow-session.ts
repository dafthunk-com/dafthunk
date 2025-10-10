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

export class WorkflowSession extends DurableObject<Bindings> {
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
      persistDebounceMs: WorkflowSession.PERSIST_DEBOUNCE_MS,
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

    // This endpoint is ONLY called by the Runtime (Cloudflare Workflow)
    // to send execution progress updates. Clients never call this directly.
    if (url.pathname.endsWith("/execution") && request.method === "POST") {
      return this.handleExecutionUpdate(request);
    }

    // Recover state from DO storage if needed (e.g., after DO restart)
    try {
      await this.stateManager.ensureInitialized();
    } catch (_error) {
      // Ignore recovery errors - will attempt to load from request parameters below
    }

    // This endpoint is called by the api to establish a WebSocket connection.
    // It requires authentication and userId.
    // It extracts workflowId from the URL path.
    const pathParts = url.pathname.split("/").filter(Boolean);
    const workflowId = pathParts[pathParts.length - 1] || "";

    // Extract userId from custom header
    const userId = request.headers.get("X-User-Id") || "";

    if (!workflowId) {
      return new Response("Missing workflowId in path", {
        status: 400,
      });
    }

    if (!userId) {
      return new Response("Missing userId header", {
        status: 401,
      });
    }

    try {
      this.stateManager.getState();
    } catch {
      try {
        await this.stateManager.loadState(workflowId, userId);
      } catch (error) {
        console.error("Error loading workflow:", error);
        return Response.json(
          {
            error: "Failed to load workflow",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 403 }
        );
      }
    }

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
        console.warn(
          `No WebSocket connection found for execution ${execution.id}`
        );
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
   * Supports two message types:
   * 1. WorkflowUpdateMessage - Update workflow state (nodes/edges)
   * 2. WorkflowExecuteMessage - Trigger workflow execution or register for updates
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      if (typeof message !== "string") {
        const errorMsg = this.executionManager.createErrorMessage(
          "Expected string message"
        );
        this.connectionManager.send(ws, JSON.stringify(errorMsg));
        return;
      }

      // Recover state if needed (WebSocket survives DO restarts but in-memory state doesn't)
      await this.stateManager.ensureInitialized();

      const data = JSON.parse(message) as ClientMessage;

      if ("type" in data && data.type === "update") {
        const updateMsg = data as WorkflowUpdateMessage;
        this.stateManager.updateState(updateMsg.state);
        this.connectionManager.broadcast(updateMsg.state);
      } else if ("type" in data && data.type === "execute") {
        const executeMsg = data as WorkflowExecuteMessage;

        if (executeMsg.executionId) {
          this.connectionManager.registerExecution(executeMsg.executionId, ws);
        } else {
          await this.handleExecuteWorkflow(ws, executeMsg.parameters);
        }
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
      const errorMsg = this.executionManager.createErrorMessage(
        "Failed to process message",
        error instanceof Error ? error.message : "Unknown error"
      );
      this.connectionManager.send(ws, JSON.stringify(errorMsg));
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
      const errorMsg = this.executionManager.createErrorMessage(
        "Workflow not initialized"
      );
      this.connectionManager.send(ws, JSON.stringify(errorMsg));
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
      const errorMsg = this.executionManager.createErrorMessage(
        "Failed to execute workflow",
        error instanceof Error ? error.message : "Unknown error"
      );
      this.connectionManager.send(ws, JSON.stringify(errorMsg));
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
