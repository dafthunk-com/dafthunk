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
  private workflows: Map<string, WorkflowSession> = new Map();
  private webSocketWorkflows: Map<WebSocket, string> = new Map();

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

  async updateState(workflowId: string, nodes: Node[], edges: Edge[]): Promise<void> {
    const session = this.workflows.get(workflowId);
    if (!session) {
      throw new Error(`Workflow ${workflowId} not loaded`);
    }

    const timestamp = Date.now();
    const updatedState: WorkflowState = {
      ...session.state,
      nodes,
      edges,
      timestamp,
    };

    this.workflows.set(workflowId, { ...session, state: updatedState });

    // Persist immediately to D1
    await this.persistToDatabase(workflowId);
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
    this.webSocketWorkflows.set(server, workflowId);

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
    const workflowId = this.webSocketWorkflows.get(ws);
    if (!workflowId) {
      console.error("WebSocket not associated with any workflow");
      return;
    }

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
        await this.updateState(workflowId, updateMsg.nodes, updateMsg.edges);
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
    const workflowId = this.webSocketWorkflows.get(ws);
    if (workflowId) {
      // Persist any pending changes to D1 before closing
      await this.persistToDatabase(workflowId);
      this.webSocketWorkflows.delete(ws);
    }
  }
}
