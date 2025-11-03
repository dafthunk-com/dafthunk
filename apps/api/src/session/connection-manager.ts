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

/**
 * Represents a WebSocket connection with its execution state
 */
interface Connection {
  ws: WebSocket;
  execution: WorkflowExecution | null;
  connectedAt: number;
}

export class ConnectionManager {
  // Primary storage: WebSocket -> Connection
  private connections: Map<WebSocket, Connection> = new Map();
  // Index: executionId -> Connection (for fast lookup)
  private executionIndex: Map<string, Connection> = new Map();

  /**
   * Recover WebSocket connections after hibernation
   *
   * Restores connection tracking and execution associations that were
   * persisted via WebSocket attachments before hibernation.
   */
  recoverConnections(websockets: WebSocket[]): void {
    for (const ws of websockets) {
      const attachment = ws.deserializeAttachment();
      const executionId = this.extractExecutionId(attachment);

      const execution: WorkflowExecution | null = executionId
        ? {
            id: executionId,
            workflowId: "",
            status: "executing",
            nodeExecutions: [],
          }
        : null;

      const connection: Connection = {
        ws,
        execution,
        connectedAt: Date.now(),
      };

      this.connections.set(ws, connection);

      if (executionId && execution) {
        this.executionIndex.set(executionId, connection);
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
    const connection: Connection = {
      ws,
      execution: null,
      connectedAt: Date.now(),
    };
    this.connections.set(ws, connection);
  }

  /**
   * Remove a WebSocket connection and clean up execution tracking
   */
  removeConnection(ws: WebSocket): void {
    const connection = this.connections.get(ws);
    if (connection?.execution) {
      this.executionIndex.delete(connection.execution.id);
    }
    this.connections.delete(ws);
  }

  /**
   * Broadcast state update to all connected clients
   * @param state The workflow state to broadcast
   * @param excludeWs Optional WebSocket to exclude from broadcast (e.g., the originating client)
   */
  broadcast(state: WorkflowState, excludeWs?: WebSocket): void {
    const updateMsg: WorkflowUpdateMessage = {
      type: "update",
      state,
    };
    const message = JSON.stringify(updateMsg);

    for (const connection of this.connections.values()) {
      // Skip the originating WebSocket to avoid echoing back to sender
      if (excludeWs && connection.ws === excludeWs) {
        continue;
      }
      this.send(connection.ws, message);
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
    const connection = this.connections.get(ws);
    if (!connection) {
      console.warn(
        `Attempted to register execution ${executionId} for unknown WebSocket`
      );
      return;
    }

    this.executionIndex.set(executionId, connection);
    ws.serializeAttachment({ executionId });
  }

  /**
   * Update execution data for a WebSocket
   */
  setExecution(ws: WebSocket, execution: WorkflowExecution): void {
    const connection = this.connections.get(ws);
    if (!connection) {
      console.warn("Attempted to set execution for unknown WebSocket");
      return;
    }

    connection.execution = execution;

    // Update index if execution has an ID
    if (execution.id) {
      this.executionIndex.set(execution.id, connection);
    }
  }

  /**
   * Get WebSocket for an execution ID
   */
  getWebSocketForExecution(executionId: string): WebSocket | undefined {
    return this.executionIndex.get(executionId)?.ws;
  }

  /**
   * Get execution for a WebSocket
   */
  getExecution(ws: WebSocket): WorkflowExecution | null | undefined {
    return this.connections.get(ws)?.execution;
  }

  /**
   * Get all active WebSocket connections
   */
  getConnections(): WebSocket[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get count of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}
