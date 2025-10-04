import {
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
  private static readonly PERSIST_DELAY_MS = 60_000;
  private static readonly STORAGE_ID = "current";

  private sql: SqlStorage;
  private workflowId: string = "";
  private organizationId: string = "";
  private loaded: boolean = false;
  private dirty: boolean = false;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    this.sql = this.ctx.storage.sql;
    this.initDatabase();
  }

  private initDatabase() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS workflow (
        id TEXT PRIMARY KEY DEFAULT 'current',
        workflow_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        handle TEXT NOT NULL,
        type TEXT NOT NULL,
        nodes TEXT NOT NULL,
        edges TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
  }

  /**
   * Load workflow from database into durable storage if not already loaded
   */
  private async ensureLoaded(
    workflowId: string,
    organizationId: string
  ): Promise<void> {
    if (this.loaded) {
      return;
    }

    this.workflowId = workflowId;
    this.organizationId = organizationId;

    try {
      // First check if SQLite storage already has data (from previous session)
      // This is important because SQLite storage persists across cold starts
      const existing = this.sql
        .exec(
          "SELECT workflow_id FROM workflow WHERE id = ?",
          DurableWorkflow.STORAGE_ID
        )
        .toArray();

      if (existing.length > 0) {
        console.log(`Using existing SQLite storage for workflow ${workflowId}`);
        this.loaded = true;
        return;
      }

      // SQLite storage is empty, load from D1 database
      console.log(`Loading workflow ${workflowId} from D1 database`);
      const db = createDatabase(this.env.DB);
      const workflow = await getWorkflow(db, workflowId, organizationId);

      const { name, handle, type, nodes, edges, timestamp } =
        this.extractWorkflowData(workflow);

      this.sql.exec(
        `INSERT INTO workflow (id, workflow_id, organization_id, name, handle, type, nodes, edges, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        DurableWorkflow.STORAGE_ID,
        workflowId,
        organizationId,
        name,
        handle,
        type,
        nodes,
        edges,
        timestamp
      );

      this.dirty = false;
    } catch (error) {
      console.error("Error loading workflow:", error);
    }

    this.loaded = true;
  }

  private extractWorkflowData(workflow: any) {
    return {
      name: workflow?.name || "New Workflow",
      handle: workflow?.handle || this.workflowId,
      type: (workflow?.data?.type || "manual") as WorkflowType,
      nodes: JSON.stringify(workflow?.data?.nodes || []),
      edges: JSON.stringify(workflow?.data?.edges || []),
      timestamp: workflow?.updatedAt?.getTime() || Date.now(),
    };
  }

  /**
   * Get state from durable storage
   */
  async getState(): Promise<WorkflowState> {
    const row = this.sql
      .exec(
        `SELECT workflow_id as id, name, handle, type, nodes, edges, timestamp 
         FROM workflow WHERE id = ?`,
        DurableWorkflow.STORAGE_ID
      )
      .toArray()[0];

    if (!row) {
      throw new Error("State missing; call ensureLoaded first");
    }

    return {
      id: row.id as string,
      name: row.name as string,
      handle: row.handle as string,
      type: row.type as WorkflowType,
      nodes: JSON.parse(row.nodes as string),
      edges: JSON.parse(row.edges as string),
      timestamp: row.timestamp as number,
    };
  }

  async updateState(nodes: unknown[], edges: unknown[]): Promise<void> {
    const timestamp = Date.now();
    this.sql.exec(
      `UPDATE workflow SET nodes = ?, edges = ?, timestamp = ? WHERE id = ?`,
      JSON.stringify(nodes),
      JSON.stringify(edges),
      timestamp,
      DurableWorkflow.STORAGE_ID
    );

    this.dirty = true;

    // Schedule an alarm to persist to database if not already scheduled
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm === null) {
      await this.ctx.storage.setAlarm(
        Date.now() + DurableWorkflow.PERSIST_DELAY_MS
      );
    }
  }

  /**
   * Persist durable state back to database
   */
  private async persistToDatabase(): Promise<void> {
    if (!this.dirty || !this.workflowId || !this.organizationId) {
      return;
    }

    try {
      const state = await this.getState();
      const db = createDatabase(this.env.DB);
      await updateWorkflow(db, this.workflowId, this.organizationId, {
        name: state.name,
        data: {
          id: state.id,
          name: state.name,
          handle: state.handle,
          type: state.type,
          nodes: state.nodes,
          edges: state.edges,
        },
      });

      this.dirty = false;
      console.log(`Persisted workflow ${this.workflowId} to database`);
    } catch (error) {
      console.error("Error persisting workflow to database:", error);
    }
  }

  /**
   * Alarm handler - called when alarm fires
   */
  async alarm(): Promise<void> {
    console.log("Alarm fired for DurableWorkflow");
    await this.persistToDatabase();

    // If still dirty (updates happened during persist), schedule another alarm
    if (this.dirty) {
      await this.ctx.storage.setAlarm(
        Date.now() + DurableWorkflow.PERSIST_DELAY_MS
      );
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId") || "";
    const organizationId = url.searchParams.get("organizationId") || "";

    if (workflowId && organizationId) {
      await this.ensureLoaded(workflowId, organizationId);
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
    try {
      return await this.getState();
    } catch {
      return {
        id: this.workflowId,
        name: "New Workflow",
        handle: this.workflowId,
        type: "manual",
        nodes: [],
        edges: [],
        timestamp: Date.now(),
      };
    }
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
    ws: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean
  ) {
    ws.close(code, reason);
  }
}
