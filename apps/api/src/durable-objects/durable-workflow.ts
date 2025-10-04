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
import { getWorkflow, updateWorkflow } from "../db/queries";

export class DurableWorkflow extends DurableObject<Bindings> {
  private state: WorkflowState | null = null;
  private workflowId: string | null = null;
  private organizationId: string | null = null;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
  }

  /**
   * Load workflow from D1 database into memory
   */
  private async loadState(
    workflowId: string,
    organizationId: string
  ): Promise<void> {
    this.workflowId = workflowId;
    this.organizationId = organizationId;

    console.log(`Loading workflow ${workflowId} from D1 database`);
    const db = createDatabase(this.env.DB);
    const workflow = await getWorkflow(db, workflowId, organizationId);

    const { name, handle, type, nodes, edges, timestamp } =
      this.extractWorkflowData(workflow);

    this.state = {
      id: workflowId,
      name,
      handle,
      type,
      nodes,
      edges,
      timestamp,
    };
  }

  private extractWorkflowData(workflow: any) {
    return {
      name: workflow?.name || "New Workflow",
      handle: workflow?.handle || this.workflowId,
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
      throw new Error("State not loaded");
    }

    return this.state;
  }

  async updateState(nodes: Node[], edges: Edge[]): Promise<void> {
    if (!this.state) {
      throw new Error("State not loaded");
    }

    const timestamp = Date.now();
    this.state = {
      ...this.state,
      nodes,
      edges,
      timestamp,
    };

    // Persist immediately to D1
    await this.persistToDatabase();
  }

  /**
   * Persist state back to D1 database
   */
  private async persistToDatabase(): Promise<void> {
    if (!this.state || !this.workflowId || !this.organizationId) {
      return;
    }

    try {
      const db = createDatabase(this.env.DB);
      await updateWorkflow(db, this.workflowId, this.organizationId, {
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

      console.log(`Persisted workflow ${this.workflowId} to D1 database`);
    } catch (error) {
      console.error("Error persisting workflow to database:", error);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId") || "";
    const organizationId = url.searchParams.get("organizationId") || "";

    if (!workflowId || !organizationId) {
      return new Response("Missing workflowId or organizationId", {
        status: 400,
      });
    }

    try {
      await this.loadState(workflowId, organizationId);
    } catch (error) {
      console.error("Error loading workflow:", error);
      return Response.json(
        {
          error: "Failed to load workflow",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 404 }
      );
    }

    if (url.pathname === "/state" && request.method === "GET") {
      return this.handleStateRequest();
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      return this.handleWebSocketUpgrade();
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

  private async handleWebSocketUpgrade(): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    const initState = await this.getInitialState();
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

  private async getInitialState(): Promise<WorkflowState> {
    return await this.getState();
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
        await this.updateState(updateMsg.nodes, updateMsg.edges);
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
    // Persist any pending changes to D1 before closing
    await this.persistToDatabase();
  }
}
