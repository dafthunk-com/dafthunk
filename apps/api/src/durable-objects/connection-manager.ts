/**
 * ConnectionManager
 *
 * Manages WebSocket connections, broadcasting, and execution tracking.
 *
 * Execution tracking:
 * - Each WebSocket can be associated with a workflow execution
 * - Executions are tracked bidirectionally (ws->execution, executionId->ws)
 * - Execution IDs are persisted via WebSocket attachments for hibernation recovery
 */

import type {
  WorkflowExecution,
  WorkflowInitMessage,
  WorkflowState,
  WorkflowUpdateMessage,
} from "@dafthunk/types";

export class ConnectionManager {
  private connections: Set<WebSocket> = new Set();
  private executions: Map<WebSocket, WorkflowExecution | null> = new Map();
  private executionIdToWebSocket: Map<string, WebSocket> = new Map();

  /**
   * Recover WebSocket connections after hibernation
   *
   * Restores connection tracking and execution associations that were
   * persisted via WebSocket attachments before hibernation.
   */
  recoverConnections(websockets: WebSocket[]): void {
    for (const ws of websockets) {
      this.connections.add(ws);

      const attachment = ws.deserializeAttachment();
      const executionId = this.extractExecutionId(attachment);

      if (executionId) {
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
   * Extract execution ID from WebSocket attachment
   */
  private extractExecutionId(attachment: unknown): string | null {
    if (!attachment || typeof attachment !== "object") {
      return null;
    }

    if (
      "executionId" in attachment &&
      typeof attachment.executionId === "string"
    ) {
      return attachment.executionId;
    }

    return null;
  }

  /**
   * Add a new WebSocket connection
   */
  addConnection(ws: WebSocket): void {
    this.connections.add(ws);
    this.executions.set(ws, null);
  }

  /**
   * Remove a WebSocket connection and clean up execution tracking
   */
  removeConnection(ws: WebSocket): void {
    this.connections.delete(ws);

    const execution = this.executions.get(ws);
    if (execution) {
      this.executionIdToWebSocket.delete(execution.id);
    }
    this.executions.delete(ws);
  }

  /**
   * Broadcast state update to all connected clients
   */
  broadcast(state: WorkflowState): void {
    const updateMsg: WorkflowUpdateMessage = {
      type: "update",
      state,
    };
    const message = JSON.stringify(updateMsg);

    for (const ws of this.connections) {
      this.send(ws, message);
    }
  }

  /**
   * Send initialization message to a specific WebSocket
   */
  sendInit(ws: WebSocket, state: WorkflowState): void {
    const initMessage: WorkflowInitMessage = {
      type: "init",
      state,
    };
    ws.send(JSON.stringify(initMessage));
  }

  /**
   * Send a message to a specific WebSocket
   */
  send(ws: WebSocket, message: string): void {
    try {
      ws.send(message);
    } catch (error) {
      console.error("Error sending to WebSocket:", error);
    }
  }

  /**
   * Register an execution ID with a WebSocket for tracking
   */
  registerExecution(executionId: string, ws: WebSocket): void {
    this.executionIdToWebSocket.set(executionId, ws);
    ws.serializeAttachment({ executionId });
    console.log(`Registered execution ${executionId} for WebSocket updates`);
  }

  /**
   * Update execution data for a WebSocket
   */
  setExecution(ws: WebSocket, execution: WorkflowExecution): void {
    this.executions.set(ws, execution);
  }

  /**
   * Get WebSocket for an execution ID
   */
  getWebSocketForExecution(executionId: string): WebSocket | undefined {
    return this.executionIdToWebSocket.get(executionId);
  }

  /**
   * Get execution for a WebSocket
   */
  getExecution(ws: WebSocket): WorkflowExecution | null | undefined {
    return this.executions.get(ws);
  }

  /**
   * Get all active connections
   */
  getConnections(): Set<WebSocket> {
    return this.connections;
  }
}
