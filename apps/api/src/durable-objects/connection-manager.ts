/**
 * ConnectionManager
 *
 * Manages WebSocket connections, broadcasting, and execution tracking.
 * Handles connection lifecycle and hibernation recovery.
 */

import type {
  WorkflowExecution,
  WorkflowInitMessage,
  WorkflowState,
  WorkflowUpdateMessage,
} from "@dafthunk/types";

export class ConnectionManager {
  private connectedUsers: Set<WebSocket> = new Set();
  private executions: Map<WebSocket, WorkflowExecution | null> = new Map();
  private executionIdToWebSocket: Map<string, WebSocket> = new Map();

  /**
   * Recover WebSocket connections after hibernation
   */
  recoverConnections(websockets: WebSocket[]): void {
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
   * Add a new WebSocket connection
   */
  addConnection(ws: WebSocket): void {
    this.connectedUsers.add(ws);
    this.executions.set(ws, null);
  }

  /**
   * Remove a WebSocket connection and clean up execution tracking
   */
  removeConnection(ws: WebSocket): void {
    this.connectedUsers.delete(ws);

    const execution = this.executions.get(ws);
    if (execution) {
      this.executionIdToWebSocket.delete(execution.id);
    }
    this.executions.delete(ws);
  }

  /**
   * Broadcast state update to all connected users
   */
  broadcast(state: WorkflowState): void {
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
   * Get all connected WebSockets
   */
  getConnectedUsers(): Set<WebSocket> {
    return this.connectedUsers;
  }
}
