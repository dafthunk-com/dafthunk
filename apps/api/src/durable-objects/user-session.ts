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

interface WorkflowSession {
  state: WorkflowState;
  organizationId: string;
}

export class UserSession extends DurableObject<Bindings> {
  private static readonly PERSIST_DEBOUNCE_MS = 500;

  private workflows: Map<string, WorkflowSession> = new Map();
  private pendingPersist: Map<string, number> = new Map();

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

    const state: WorkflowState = {
      id: workflowId,
      name,
      handle,
      type,
      nodes,
      edges,
      timestamp,
    };

    this.workflows.set(workflowId, { state, organizationId });
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
   * Get state from memory for a specific workflow
   */
  async getState(workflowId: string): Promise<WorkflowState> {
    const session = this.workflows.get(workflowId);
    if (!session) {
      throw new Error(`Workflow ${workflowId} not loaded`);
    }

    return session.state;
  }

  async updateState(state: WorkflowState): Promise<void> {
    const session = this.workflows.get(state.id);
    if (!session) {
      throw new Error(`Workflow ${state.id} not loaded`);
    }

    // Validate incoming state matches session
    if (state.id !== session.state.id) {
      throw new Error(`Workflow ID mismatch: expected ${session.state.id}, got ${state.id}`);
    }

    // Validate required fields
    if (!state.name || !state.handle || !state.type) {
      throw new Error("Invalid state: missing required fields (name, handle, or type)");
    }

    // Validate arrays are present
    if (!Array.isArray(state.nodes) || !Array.isArray(state.edges)) {
      throw new Error("Invalid state: nodes and edges must be arrays");
    }

    this.workflows.set(state.id, { ...session, state });

    // Debounce persistence to reduce D1 writes on rapid updates
    this.schedulePersist(state.id);
  }

  /**
   * Schedule a debounced persist for a workflow
   */
  private schedulePersist(workflowId: string): void {
    // Clear any existing timeout
    const existingTimeout = this.pendingPersist.get(workflowId);
    if (existingTimeout !== undefined) {
      clearTimeout(existingTimeout);
    }

    // Schedule new persist
    const timeoutId = setTimeout(() => {
      this.persistToDatabase(workflowId);
      this.pendingPersist.delete(workflowId);
    }, UserSession.PERSIST_DEBOUNCE_MS) as unknown as number;

    this.pendingPersist.set(workflowId, timeoutId);
  }

  /**
   * Persist state back to D1 database
   */
  private async persistToDatabase(workflowId: string): Promise<void> {
    const session = this.workflows.get(workflowId);

    if (!session) {
      return;
    }

    try {
      const db = createDatabase(this.env.DB);
      await updateWorkflow(db, workflowId, session.organizationId, {
        name: session.state.name,
        data: {
          id: session.state.id,
          name: session.state.name,
          handle: session.state.handle,
          type: session.state.type,
          nodes: session.state.nodes,
          edges: session.state.edges,
        },
      });

      console.log(`Persisted workflow ${workflowId} to D1 database`);
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
    if (!this.workflows.has(workflowId)) {
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
      return this.handleStateRequest(workflowId);
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      return this.handleWebSocketUpgrade(workflowId);
    }

    return new Response("Expected /state GET or WebSocket upgrade", {
      status: 400,
    });
  }

  private async handleStateRequest(workflowId: string): Promise<Response> {
    try {
      const state = await this.getState(workflowId);
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

  private async handleWebSocketUpgrade(workflowId: string): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    const initState = await this.getState(workflowId);
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
    _ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ) {
    // Flush all pending persists when connection closes
    const persistPromises: Promise<void>[] = [];

    for (const [workflowId, timeoutId] of this.pendingPersist.entries()) {
      clearTimeout(timeoutId);
      persistPromises.push(this.persistToDatabase(workflowId));
      this.pendingPersist.delete(workflowId);
    }

    await Promise.all(persistPromises);
  }
}
