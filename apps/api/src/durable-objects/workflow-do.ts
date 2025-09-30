import {
  WorkflowDOAckMessage,
  WorkflowDOErrorMessage,
  WorkflowDOExecuteMessage,
  WorkflowDOExecutionUpdateMessage,
  WorkflowDOInitMessage,
  WorkflowDOMessage,
  WorkflowDOState,
  WorkflowDOUpdateMessage,
  WorkflowExecution,
  WorkflowType,
} from "@dafthunk/types";
import { DurableObject } from "cloudflare:workers";

import { Bindings } from "../context";
import { createDatabase } from "../db/index";
import { getWorkflow, updateWorkflow } from "../db/queries";

export class WorkflowDO extends DurableObject<Bindings> {
  private sql: SqlStorage;
  private connectedClients: Set<WebSocket> = new Set();
  private currentExecution: WorkflowExecution | null = null;
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
   * Load workflow from database into DO storage if not already loaded
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

    // Ensure metadata exists
    let metadataRow = this.sql
      .exec("SELECT * FROM metadata WHERE id = ?", "default")
      .toArray()[0];

    if (!metadataRow) {
      try {
        const db = createDatabase(this.env.DB);
        const workflow = await getWorkflow(db, workflowId, organizationId);
        if (workflow) {
          const workflowData = workflow.data as any;
          this.sql.exec(
            `INSERT INTO metadata (id, workflow_id, organization_id, workflow_name, workflow_handle, workflow_type)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               workflow_id = excluded.workflow_id,
               organization_id = excluded.organization_id,
               workflow_name = excluded.workflow_name,
               workflow_handle = excluded.workflow_handle,
               workflow_type = excluded.workflow_type`,
            "default",
            workflowId,
            organizationId,
            workflow.name,
            workflow.handle,
            (workflowData.type || "manual") as WorkflowType
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
      } catch (error) {
        console.error("Error loading workflow metadata:", error);
      }
    }

    // Ensure states entry exists
    const statesRow = this.sql
      .exec("SELECT * FROM states WHERE id = ?", "default")
      .toArray()[0];
    if (!statesRow) {
      const timestamp = Date.now();
      this.sql.exec(
        `INSERT INTO states (id, nodes, edges, timestamp)
         VALUES (?, ?, ?, ?)`,
        "default",
        JSON.stringify([]),
        JSON.stringify([]),
        timestamp
      );
    }

    this.loaded = true;
  }

  /**
   * Get state from DO storage (internal use)
   */
  private async getStateInternal(): Promise<WorkflowDOState> {
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
  async getState(): Promise<WorkflowDOState> {
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
   * Persist DO state back to database
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
    console.log("Alarm fired for WorkflowDO");
    await this.persistToDatabase();

    // If still dirty (updates happened during persist), schedule another alarm
    if (this.dirty) {
      await this.ctx.storage.setAlarm(Date.now() + 60000);
    }
  }

  private broadcastExecutionUpdate(execution: WorkflowExecution) {
    const message: WorkflowDOExecutionUpdateMessage = {
      type: "execution_update",
      executionId: execution.id,
      status: execution.status,
      nodeExecutions: execution.nodeExecutions,
      error: execution.error,
    };

    const messageStr = JSON.stringify(message);
    for (const client of this.connectedClients) {
      try {
        client.send(messageStr);
      } catch (error) {
        console.error("Error broadcasting to client:", error);
      }
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

    // Handle execution updates from the runtime
    if (url.pathname === "/execution" && request.method === "POST") {
      try {
        const execution = (await request.json()) as WorkflowExecution;
        await this.updateExecution(execution);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error updating execution:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to update execution",
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
    this.connectedClients.add(server);

    // Send initial state
    let initState: WorkflowDOState;
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
    const initMessage: WorkflowDOInitMessage = {
      type: "init",
      state: initState,
    };
    server.send(JSON.stringify(initMessage));

    // If there's an ongoing execution, send the current state
    if (this.currentExecution) {
      this.broadcastExecutionUpdate(this.currentExecution);
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      if (typeof message !== "string") {
        const errorMsg: WorkflowDOErrorMessage = {
          error: "Expected string message",
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      const data = JSON.parse(message) as WorkflowDOMessage;

      if ("type" in data && data.type === "update") {
        const updateMsg = data as WorkflowDOUpdateMessage;
        await this.updateState(updateMsg.nodes, updateMsg.edges);

        // Optionally echo back confirmation
        const ackMsg: WorkflowDOAckMessage = {
          type: "ack",
          timestamp: Date.now(),
        };
        ws.send(JSON.stringify(ackMsg));
      } else if ("type" in data && data.type === "execute") {
        const executeMsg = data as WorkflowDOExecuteMessage;

        // Store the execution ID so we can track updates from the runtime
        this.currentExecution = {
          id: executeMsg.executionId,
          workflowId: this.workflowId,
          status: "submitted",
          nodeExecutions: [],
        };

        // Broadcast initial execution state to all clients
        this.broadcastExecutionUpdate(this.currentExecution);
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
      const errorMsg: WorkflowDOErrorMessage = {
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
    this.connectedClients.delete(ws);
    ws.close(code, reason);
  }

  /**
   * Called by the runtime workflow to push execution updates to connected clients
   */
  async updateExecution(execution: WorkflowExecution) {
    this.currentExecution = execution;
    this.broadcastExecutionUpdate(execution);

    // Clear current execution if it's in a terminal state
    if (
      execution.status === "completed" ||
      execution.status === "error" ||
      execution.status === "cancelled" ||
      execution.status === "exhausted"
    ) {
      this.currentExecution = null;
    }
  }
}
