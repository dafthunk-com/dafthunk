import {
  Edge,
  Node,
  WorkflowErrorMessage,
  WorkflowInitMessage,
  WorkflowMessage,
  WorkflowState,
  WorkflowType,
  WorkflowUpdateMessage,
} from "@dafthunk/types";
import { DurableObject } from "cloudflare:workers";

import { Bindings } from "../context";
import { createDatabase } from "../db/index";
import { getWorkflowWithUserAccess, updateWorkflow } from "../db/queries";

export class WorkflowSession extends DurableObject<Bindings> {
  private static readonly PERSIST_DEBOUNCE_MS = 500;

  private state: WorkflowState | null = null;
  private organizationId: string | null = null;
  private pendingPersistTimeout: number | undefined = undefined;
  private connectedUsers: Set<WebSocket> = new Set();

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
  }

  /**
   * Load workflow from D1 database with user access verification
   */
  private async loadState(
    workflowId: string,
    userId: string
  ): Promise<void> {
    console.log(`Loading workflow ${workflowId} for user ${userId}`);
    const db = createDatabase(this.env.DB);
    const result = await getWorkflowWithUserAccess(db, workflowId, userId);

    if (!result) {
      throw new Error(`User ${userId} does not have access to workflow ${workflowId}`);
    }

    const { workflow, organizationId } = result;

    const { name, handle, type, nodes, edges, timestamp } =
      this.extractWorkflowData(workflow, workflowId);

    this.state = {
      id: workflowId,
      name,
      handle,
      type,
      nodes,
      edges,
      timestamp,
    };

    this.organizationId = organizationId;
  }

  private extractWorkflowData(workflow: any, workflowId: string) {
    return {
      name: workflow?.name || "New Workflow",
      handle: workflow?.handle || workflowId,
      type: (workflow?.data?.type || "manual") as WorkflowType,
      nodes: workflow?.data?.nodes || [],
      edges: workflow?.data?.edges || [],
      timestamp: workflow?.updatedAt?.getTime() || Date.now(),
    };
  }

  /**
   * Get state from memory
   */
  async getState(): Promise<WorkflowState> {
    if (!this.state) {
      throw new Error("Workflow not loaded");
    }

    return this.state;
  }

  async updateState(state: WorkflowState): Promise<void> {
    if (!this.state) {
      throw new Error("Workflow not loaded");
    }

    // Validate incoming state matches current state
    if (state.id !== this.state.id) {
      throw new Error(`Workflow ID mismatch: expected ${this.state.id}, got ${state.id}`);
    }

    // Validate required fields
    if (!state.name || !state.handle || !state.type) {
      throw new Error("Invalid state: missing required fields (name, handle, or type)");
    }

    // Validate arrays are present
    if (!Array.isArray(state.nodes) || !Array.isArray(state.edges)) {
      throw new Error("Invalid state: nodes and edges must be arrays");
    }

    this.state = state;

    // Broadcast to all connected users
    this.broadcast(state);

    // Debounce persistence to reduce D1 writes on rapid updates
    this.schedulePersist();
  }

  /**
   * Broadcast state update to all connected users
   */
  private broadcast(state: WorkflowState): void {
    const updateMsg: WorkflowUpdateMessage = {
      type: "update",
      state,
    };
    const message = JSON.stringify(updateMsg);

    for (const ws of this.connectedUsers) {
      try {
        ws.send(message);
      } catch (error) {
        console.error("Error broadcasting to WebSocket:", error);
      }
    }
  }

  /**
   * Schedule a debounced persist
   */
  private schedulePersist(): void {
    // Clear any existing timeout
    if (this.pendingPersistTimeout !== undefined) {
      clearTimeout(this.pendingPersistTimeout);
    }

    // Schedule new persist
    this.pendingPersistTimeout = setTimeout(() => {
      this.persistToDatabase();
      this.pendingPersistTimeout = undefined;
    }, WorkflowSession.PERSIST_DEBOUNCE_MS) as unknown as number;
  }

  /**
   * Persist state back to D1 database
   */
  private async persistToDatabase(): Promise<void> {
    if (!this.state || !this.organizationId) {
      return;
    }

    try {
      const db = createDatabase(this.env.DB);
      await updateWorkflow(db, this.state.id, this.organizationId, {
        name: this.state.name,
        data: {
          id: this.state.id,
          name: this.state.name,
          handle: this.state.handle,
          type: this.state.type,
          nodes: this.state.nodes,
          edges: this.state.edges,
        },
      });

      console.log(`Persisted workflow ${this.state.id} to D1 database`);
    } catch (error) {
      console.error("Error persisting workflow to database:", error);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Extract workflowId from URL path (e.g., /ws/:workflowId)
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

    // Only load if not already in memory
    if (!this.state) {
      try {
        await this.loadState(workflowId, userId);
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
      const state = await this.getState();
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

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);
    this.connectedUsers.add(server);

    const initState = await this.getState();
    const initMessage: WorkflowInitMessage = {
      type: "init",
      state: initState,
    };
    server.send(JSON.stringify(initMessage));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      if (typeof message !== "string") {
        const errorMsg: WorkflowErrorMessage = {
          error: "Expected string message",
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      const data = JSON.parse(message) as WorkflowMessage;

      if ("type" in data && data.type === "update") {
        const updateMsg = data as WorkflowUpdateMessage;

        // Update with the new state
        await this.updateState(updateMsg.state);
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
      const errorMsg: WorkflowErrorMessage = {
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      ws.send(JSON.stringify(errorMsg));
    }
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ) {
    // Remove WebSocket from connected users
    this.connectedUsers.delete(ws);

    // Flush pending persist when connection closes
    if (this.pendingPersistTimeout !== undefined) {
      clearTimeout(this.pendingPersistTimeout);
      await this.persistToDatabase();
      this.pendingPersistTimeout = undefined;
    }
  }
}
