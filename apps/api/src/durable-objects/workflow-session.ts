/**
 * WorkflowSession Durable Object
 *
 * Manages workflow state synchronization and execution coordination via WebSocket.
 * Clients connect via WebSocket to sync state and receive realtime execution updates.
 */

import {
  ClientMessage,
  WorkflowErrorMessage,
  WorkflowExecuteMessage,
  WorkflowExecution,
  WorkflowExecutionUpdateMessage,
  WorkflowInitMessage,
  WorkflowState,
  WorkflowUpdateMessage,
} from "@dafthunk/types";
import { DurableObject } from "cloudflare:workers";

import { Bindings } from "../context";
import { createDatabase, ExecutionStatus, saveExecution } from "../db/index";
import {
  getOrganizationComputeCredits,
  getWorkflowWithUserAccess,
  updateWorkflow,
} from "../db/queries";
import { ObjectStore } from "../runtime/object-store";
import { createSimulatedEmailMessage } from "../utils/email";
import {
  createSimulatedHttpRequest,
  processHttpParameters,
} from "../utils/http";

export class WorkflowSession extends DurableObject<Bindings> {
  private static readonly PERSIST_DEBOUNCE_MS = 500;

  private state: WorkflowState | null = null;
  private organizationId: string | null = null;
  private userId: string | null = null;
  private pendingPersistTimeout: number | undefined = undefined;
  private connectedUsers: Set<WebSocket> = new Set();
  private executions: Map<WebSocket, WorkflowExecution | null> = new Map();
  private executionIdToWebSocket: Map<string, WebSocket> = new Map();

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);

    // Recover WebSocket connections after hibernation
    // When the DO wakes up, we need to rebuild our in-memory Maps
    const websockets = this.ctx.getWebSockets();
    for (const ws of websockets) {
      this.connectedUsers.add(ws);

      // Deserialize execution ID if attached
      const attachment = ws.deserializeAttachment();
      if (
        attachment &&
        typeof attachment === "object" &&
        "executionId" in attachment
      ) {
        const executionId = attachment.executionId as string;
        this.executionIdToWebSocket.set(executionId, ws);
        this.executions.set(ws, {
          id: executionId,
          workflowId: "",
          status: "executing",
          nodeExecutions: [],
        });
        console.log(
          `Recovered WebSocket for execution ${executionId} after hibernation`
        );
      } else {
        this.executions.set(ws, null);
      }
    }
  }

  /**
   * Load workflow from D1 database (metadata) and R2 (full data) with user access verification
   */
  private async loadState(workflowId: string, userId: string): Promise<void> {
    console.log(`Loading workflow ${workflowId} for user ${userId}`);
    const db = createDatabase(this.env.DB);
    const result = await getWorkflowWithUserAccess(db, workflowId, userId);

    if (!result) {
      throw new Error(
        `User ${userId} does not have access to workflow ${workflowId}`
      );
    }

    const { workflow, organizationId } = result;

    // Load full workflow data from R2
    const objectStore = new ObjectStore(this.env.RESSOURCES);
    let workflowData;
    try {
      workflowData = await objectStore.readWorkflow(workflowId);
    } catch (error) {
      console.error(
        `Failed to load workflow data from R2 for ${workflowId}:`,
        error
      );
      // Fall back to empty workflow structure
      workflowData = {
        id: workflowId,
        name: workflow.name,
        handle: workflow.handle,
        type: workflow.type,
        nodes: [],
        edges: [],
      };
    }

    this.state = {
      id: workflowId,
      name: workflowData.name,
      handle: workflowData.handle,
      type: workflowData.type,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
      timestamp: workflow?.updatedAt?.getTime() || Date.now(),
    };

    this.organizationId = organizationId;
  }

  /**
   * Ensure state is initialized, recovering from DO storage if needed
   * Throws error if recovery fails
   */
  private async ensureStateInitialized(): Promise<void> {
    if (this.state) {
      return;
    }

    const storedWorkflowId = await this.ctx.storage.get<string>("workflowId");
    const storedUserId = await this.ctx.storage.get<string>("userId");

    if (!storedWorkflowId || !storedUserId) {
      throw new Error("Session state lost. Please refresh the page.");
    }

    try {
      await this.loadState(storedWorkflowId, storedUserId);
      this.userId = storedUserId;
      console.log(`Recovered state for workflow ${storedWorkflowId}`);
    } catch (error) {
      console.error("Failed to recover state from storage:", error);
      throw new Error("Session state lost. Please refresh the page.");
    }
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
      throw new Error(
        `Workflow ID mismatch: expected ${this.state.id}, got ${state.id}`
      );
    }

    // Validate required fields
    if (!state.name || !state.handle || !state.type) {
      throw new Error(
        "Invalid state: missing required fields (name, handle, or type)"
      );
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
   * Persist state back to D1 database (metadata) and R2 (full data)
   */
  private async persistToDatabase(): Promise<void> {
    if (!this.state || !this.organizationId) {
      return;
    }

    try {
      const db = createDatabase(this.env.DB);
      const objectStore = new ObjectStore(this.env.RESSOURCES);

      // Save full workflow data to R2
      const workflowData = {
        id: this.state.id,
        name: this.state.name,
        handle: this.state.handle,
        type: this.state.type,
        nodes: this.state.nodes,
        edges: this.state.edges,
      };

      await objectStore.writeWorkflow(workflowData);

      // Save metadata to D1 database
      await updateWorkflow(db, this.state.id, this.organizationId, {
        name: this.state.name,
        type: this.state.type,
      });

      console.log(`Persisted workflow ${this.state.id} to D1 database and R2`);
    } catch (error) {
      console.error("Error persisting workflow:", error);
    }
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
      await this.ensureStateInitialized();
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

    if (!this.state) {
      try {
        await this.loadState(workflowId, userId);
        this.userId = userId;
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

  /**
   * Handle execution updates from Runtime (internal endpoint)
   */
  private async handleExecutionUpdate(request: Request): Promise<Response> {
    try {
      const execution = (await request.json()) as WorkflowExecution;

      const ws = this.executionIdToWebSocket.get(execution.id);
      if (!ws) {
        console.warn(
          `No WebSocket connection found for execution ${execution.id}`
        );
        return Response.json({ ok: true });
      }

      this.executions.set(ws, execution);

      const updateMessage: WorkflowExecutionUpdateMessage = {
        type: "execution_update",
        executionId: execution.id,
        status: execution.status,
        nodeExecutions: execution.nodeExecutions,
        error: execution.error,
      };

      ws.send(JSON.stringify(updateMessage));

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
    // This ensures that if the DO is evicted and restarted, we can recover the state
    if (this.state && this.userId) {
      await this.ctx.storage.put("workflowId", this.state.id);
      await this.ctx.storage.put("userId", this.userId);
    }

    this.ctx.acceptWebSocket(server);
    this.connectedUsers.add(server);
    this.executions.set(server, null); // Initialize with no execution

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
        const errorMsg: WorkflowErrorMessage = {
          error: "Expected string message",
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      // Recover state if needed (WebSocket survives DO restarts but in-memory state doesn't)
      await this.ensureStateInitialized();

      const data = JSON.parse(message) as ClientMessage;

      if ("type" in data && data.type === "update") {
        const updateMsg = data as WorkflowUpdateMessage;
        await this.updateState(updateMsg.state);
      } else if ("type" in data && data.type === "execute") {
        const executeMsg = data as WorkflowExecuteMessage;

        if (executeMsg.executionId) {
          this.executionIdToWebSocket.set(executeMsg.executionId, ws);
          // Attach execution ID to WebSocket for hibernation recovery
          ws.serializeAttachment({ executionId: executeMsg.executionId });
          console.log(
            `Registered execution ${executeMsg.executionId} for WebSocket updates`
          );
        } else {
          await this.handleExecuteWorkflow(ws, executeMsg.parameters);
        }
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

  /**
   * Handle workflow execution triggered via WebSocket
   */
  private async handleExecuteWorkflow(
    ws: WebSocket,
    parameters?: Record<string, unknown>
  ): Promise<void> {
    if (!this.state || !this.organizationId || !this.userId) {
      const errorMsg: WorkflowErrorMessage = {
        error: "Workflow not initialized",
      };
      ws.send(JSON.stringify(errorMsg));
      return;
    }

    try {
      const db = createDatabase(this.env.DB);

      // Get organization compute credits
      const computeCredits = await getOrganizationComputeCredits(
        db,
        this.organizationId
      );
      if (computeCredits === undefined) {
        const errorMsg: WorkflowErrorMessage = {
          error: "Organization not found",
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      // Validate workflow has nodes
      if (!this.state.nodes || this.state.nodes.length === 0) {
        const errorMsg: WorkflowErrorMessage = {
          error:
            "Cannot execute an empty workflow. Please add nodes to the workflow.",
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      // Construct emailMessage or httpRequest from parameters based on workflow type
      let emailMessage;
      let httpRequest;

      if (this.state.type === "email_message") {
        // For email workflows, extract email parameters
        if (parameters && typeof parameters === "object") {
          const { from, subject, body } = parameters as {
            from?: string;
            subject?: string;
            body?: string;
          };

          emailMessage = createSimulatedEmailMessage({
            from,
            subject,
            body,
            organizationId: this.organizationId,
            workflowHandleOrId: this.state.handle || this.state.id,
          });
        }
      } else if (this.state.type === "http_request") {
        // For HTTP workflows, process parameters to extract body and formData
        const { body: requestBody, formData: requestFormData } =
          processHttpParameters(parameters as Record<string, any>);

        // Create HTTP request with simulated metadata and parameters as body/formData
        httpRequest = createSimulatedHttpRequest({
          // Simulated HTTP metadata (defaults from createSimulatedHttpRequest)
          url: undefined,
          method: undefined,
          headers: undefined,
          query: undefined,
          // Parameters become the body and formData
          body: requestBody,
          formData: requestFormData,
        });
      } else {
        // For other workflow types, provide basic HTTP context without body
        httpRequest = createSimulatedHttpRequest({});
      }

      const executionParams = {
        workflow: {
          id: this.state.id,
          name: this.state.name,
          handle: this.state.handle,
          type: this.state.type,
          nodes: this.state.nodes,
          edges: this.state.edges,
        },
        userId: this.userId,
        organizationId: this.organizationId,
        computeCredits,
        workflowSessionId: this.state.id,
        ...(emailMessage && { emailMessage }),
        ...(httpRequest && { httpRequest }),
      };

      // Start workflow execution
      const instance = await this.env.EXECUTE.create({
        params: executionParams,
      });
      const executionId = instance.id;

      // Register this WebSocket for execution updates
      this.executionIdToWebSocket.set(executionId, ws);
      // Attach execution ID to WebSocket for hibernation recovery
      ws.serializeAttachment({ executionId });

      // Build initial nodeExecutions
      const nodeExecutions = this.state.nodes.map((node) => ({
        nodeId: node.id,
        status: "executing" as const,
      }));

      // Save initial execution record (metadata to DB)
      const initialExecution = await saveExecution(db, {
        id: executionId,
        workflowId: this.state.id,
        userId: this.userId,
        organizationId: this.organizationId,
        status: ExecutionStatus.EXECUTING,
        nodeExecutions,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Save execution data to R2
      const objectStore = new ObjectStore(this.env.RESSOURCES);
      try {
        await objectStore.writeExecution(initialExecution);
      } catch (error) {
        console.error(`Failed to save execution to R2: ${executionId}`, error);
      }

      // Store execution for this WebSocket
      this.executions.set(ws, {
        id: initialExecution.id,
        workflowId: initialExecution.workflowId,
        status: "submitted",
        nodeExecutions: initialExecution.nodeExecutions,
      });

      // Send execution started message
      const updateMessage: WorkflowExecutionUpdateMessage = {
        type: "execution_update",
        executionId: initialExecution.id,
        status: "submitted",
        nodeExecutions: initialExecution.nodeExecutions,
      };
      ws.send(JSON.stringify(updateMessage));

      console.log(
        `Started workflow execution ${executionId} for workflow ${this.state.id}`
      );
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      const errorMsg: WorkflowErrorMessage = {
        error: "Failed to execute workflow",
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
    this.connectedUsers.delete(ws);

    const execution = this.executions.get(ws);
    if (execution) {
      this.executionIdToWebSocket.delete(execution.id);
    }
    this.executions.delete(ws);

    if (this.pendingPersistTimeout !== undefined) {
      clearTimeout(this.pendingPersistTimeout);
      await this.persistToDatabase();
      this.pendingPersistTimeout = undefined;
    }
  }
}
