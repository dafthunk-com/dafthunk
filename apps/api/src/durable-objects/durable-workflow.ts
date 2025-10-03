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
      CREATE TABLE IF NOT EXISTS states (
        id TEXT PRIMARY KEY,
        nodes TEXT NOT NULL,
        edges TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        workflow_handle TEXT NOT NULL,
        workflow_type TEXT NOT NULL
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
      const existingMetadata = this.sql
        .exec("SELECT workflow_id FROM metadata WHERE id = ?", "default")
        .toArray();

      if (existingMetadata.length > 0) {
        // SQLite storage has data, use it (it's more recent than D1)
        console.log(
          `Using existing SQLite storage for workflow ${workflowId}`
        );
        this.loaded = true;
        return;
      }

      // SQLite storage is empty, load from D1 database
      console.log(`Loading workflow ${workflowId} from D1 database`);
      const db = createDatabase(this.env.DB);
      const workflow = await getWorkflow(db, workflowId, organizationId);

      const nodes = workflow
        ? JSON.stringify((workflow.data as any).nodes || [])
        : JSON.stringify([]);
      const edges = workflow
        ? JSON.stringify((workflow.data as any).edges || [])
        : JSON.stringify([]);
      const timestamp = workflow
        ? workflow.updatedAt
          ? workflow.updatedAt.getTime()
          : Date.now()
        : Date.now();

      // Insert metadata
      if (workflow) {
        this.sql.exec(
          `INSERT INTO metadata (id, workflow_id, organization_id, workflow_name, workflow_handle, workflow_type)
           VALUES (?, ?, ?, ?, ?, ?)`,
          "default",
          workflowId,
          organizationId,
          workflow.name,
          workflow.handle,
          ((workflow.data as any).type || "manual") as WorkflowType
        );
      } else {
        // Minimal metadata for new workflow
        this.sql.exec(
          `INSERT INTO metadata (id, workflow_id, organization_id, workflow_name, workflow_handle, workflow_type)
           VALUES (?, ?, ?, ?, ?, ?)`,
          "default",
          workflowId,
          organizationId,
          "New Workflow",
          workflowId,
          "manual" as WorkflowType
        );
      }

      // Insert states
      this.sql.exec(
        `INSERT INTO states (id, nodes, edges, timestamp)
         VALUES (?, ?, ?, ?)`,
        "default",
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

  /**
   * Get state from durable storage (internal use)
   */
  private async getStateInternal(): Promise<WorkflowState> {
    const statesCursor = this.sql.exec(
      "SELECT nodes, edges, timestamp FROM states WHERE id = ?",
      "default"
    );
    const statesRow = statesCursor.toArray()[0];

    const metadataCursor = this.sql.exec(
      "SELECT workflow_id as id, workflow_name as name, workflow_handle as handle, workflow_type as type FROM metadata WHERE id = ?",
      "default"
    );
    const metadataRow = metadataCursor.toArray()[0];

    if (!statesRow || !metadataRow) {
      throw new Error("State or metadata missing; call ensureLoaded first");
    }

    return {
      id: metadataRow.id as string,
      name: metadataRow.name as string,
      handle: metadataRow.handle as string,
      type: metadataRow.type as WorkflowType,
      nodes: JSON.parse(statesRow.nodes as string),
      edges: JSON.parse(statesRow.edges as string),
      timestamp: statesRow.timestamp as number,
    };
  }

  /**
   * Get state (public API)
   */
  async getState(): Promise<WorkflowState> {
    return await this.getStateInternal();
  }

  async updateState(nodes: unknown[], edges: unknown[]): Promise<void> {
    const timestamp = Date.now();
    this.sql.exec(
      `INSERT INTO states (id, nodes, edges, timestamp)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nodes = excluded.nodes,
         edges = excluded.edges,
         timestamp = excluded.timestamp`,
      "default",
      JSON.stringify(nodes),
      JSON.stringify(edges),
      timestamp
    );

    this.dirty = true;

    // Schedule an alarm to persist to database in 60 seconds if not already scheduled
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm === null) {
      await this.ctx.storage.setAlarm(Date.now() + 60000);
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
      await this.ctx.storage.setAlarm(Date.now() + 60000);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Extract workflowId and organizationId from query params
    const workflowId = url.searchParams.get("workflowId") || "";
    const organizationId = url.searchParams.get("organizationId") || "";

    // Ensure workflow is loaded from database
    if (workflowId && organizationId) {
      await this.ensureLoaded(workflowId, organizationId);
    }

    // Handle GET request for workflow state
    if (url.pathname === "/state" && request.method === "GET") {
      try {
        const state = await this.getState();

        return new Response(JSON.stringify(state), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error getting workflow state:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to get workflow state",
            details: error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle WebSocket connections (ensureLoaded called earlier if params present)
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket or /state GET request", {
        status: 426,
      });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    // Send initial state
    let initState: WorkflowState;
    try {
      initState = await this.getState();
    } catch {
      // Fallback minimal state
      initState = {
        id: workflowId,
        name: "New Workflow",
        handle: workflowId,
        type: "manual",
        nodes: [],
        edges: [],
        timestamp: Date.now(),
      };
    }
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
