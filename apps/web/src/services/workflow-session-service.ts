import type {
  ClientMessage,
  Edge,
  Node,
  ServerMessage,
  WorkflowExecution,
  WorkflowState,
} from "@dafthunk/types";

import { getApiBaseUrl } from "@/config/api";

// Re-export for convenience
export type { WorkflowState };

export interface WorkflowWSOptions {
  // Message-level callbacks (application protocol)
  onInit?: (state: WorkflowState) => void;
  onUpdate?: (state: WorkflowState) => void;
  onOperationalError?: (error: string, details?: string) => void;
  onExecutionUpdate?: (execution: WorkflowExecution) => void;

  // Connection-level callbacks (WebSocket protocol)
  onConnectionOpen?: () => void;
  onConnectionClose?: (event: CloseEvent) => void;
  onConnectionError?: (event: Event) => void;
}

export class WorkflowWebSocket {
  // WebSocket close codes
  private static readonly NORMAL_CLOSURE = 1000;
  private static readonly GOING_AWAY = 1001;
  private static readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private shouldReconnect = true;
  private currentState: WorkflowState | null = null;

  constructor(
    private orgHandle: string,
    private workflowId: string,
    private options: WorkflowWSOptions = {}
  ) {}

  connect(): void {
    if (this.isConnectedOrConnecting()) {
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    const wsBaseUrl = apiBaseUrl.replace(/^http/, "ws");
    const url = `${wsBaseUrl}/${this.orgHandle}/ws/${this.workflowId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("[WorkflowWS] Connected");
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.options.onConnectionOpen?.();
      };

      this.ws.onmessage = (event) => this.handleMessage(event);

      this.ws.onerror = (event) => {
        console.error("[WorkflowWS] Connection error:", event);
        this.options.onConnectionError?.(event);
      };

      this.ws.onclose = (event) => {
        console.log("[WorkflowWS] Closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        this.options.onConnectionClose?.(event);

        if (this.shouldAttemptReconnect(event)) {
          this.reconnectAttempts++;
          console.log(
            `[WorkflowWS] Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
          );

          setTimeout(() => this.connect(), this.reconnectDelay);

          // Exponential backoff
          this.reconnectDelay = Math.min(
            this.reconnectDelay * 2,
            WorkflowWebSocket.MAX_RECONNECT_DELAY
          );
        }
      };
    } catch (error) {
      console.error("[WorkflowWS] Failed to create WebSocket:", error);
      // Connection creation failure is a connection-level error
      this.options.onConnectionError?.(
        new Event("error", { cancelable: false })
      );
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as ServerMessage;

      // Route typed messages
      if ("type" in message) {
        switch (message.type) {
          case "init":
            this.currentState = message.state;
            this.options.onInit?.(message.state);
            break;

          case "update":
            this.currentState = message.state;
            this.options.onUpdate?.(message.state);
            break;

          case "execution_update":
            // Execution updates are normal results, not errors
            // Even if execution.error is set, this is just a summary
            this.options.onExecutionUpdate?.({
              id: message.executionId,
              workflowId: this.workflowId,
              status: message.status,
              nodeExecutions: message.nodeExecutions,
              error: message.error,
            });
            break;
        }
      } else if ("error" in message) {
        // WorkflowErrorMessage - operational errors (no type field)
        // e.g., "Failed to execute workflow", "Workflow not initialized"
        console.error("[WorkflowWS] Operational error:", message.error);
        this.options.onOperationalError?.(
          message.error || "Unknown error",
          message.details
        );
      }
    } catch (error) {
      console.error("[WorkflowWS] Failed to parse message:", error);
      // Message parsing failure is an operational error, not a connection error
      this.options.onOperationalError?.("Failed to parse message");
    }
  }

  /**
   * Determine if we should attempt to reconnect after close
   */
  private shouldAttemptReconnect(event: CloseEvent): boolean {
    return (
      this.shouldReconnect &&
      this.reconnectAttempts < this.maxReconnectAttempts &&
      !event.wasClean &&
      event.code !== WorkflowWebSocket.NORMAL_CLOSURE &&
      event.code !== WorkflowWebSocket.GOING_AWAY
    );
  }

  /**
   * Send workflow state update
   */
  send(nodes: Node[], edges: Edge[]): void {
    if (!this.currentState) {
      console.warn("[WorkflowWS] No current state available, cannot send update");
      return;
    }

    const updatedState: WorkflowState = {
      ...this.currentState,
      nodes,
      edges,
      timestamp: Date.now(),
    };

    const success = this.sendJson(
      { type: "update", state: updatedState },
      "Failed to send state update"
    );

    if (success) {
      this.currentState = updatedState;
    }
  }

  /**
   * Send a JSON message via WebSocket
   */
  private sendJson(message: ClientMessage, errorMessage: string): boolean {
    if (!this.isConnected()) {
      console.warn("[WorkflowWS] Not connected, cannot send message");
      this.options.onOperationalError?.("WebSocket is not connected");
      return false;
    }

    try {
      this.ws?.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[WorkflowWS] ${errorMessage}:`, error);
      this.options.onOperationalError?.(errorMessage);
      return false;
    }
  }

  /**
   * Execute workflow and receive realtime updates via WebSocket
   */
  executeWorkflow(options?: { parameters?: Record<string, unknown> }): void {
    this.sendJson(
      {
        type: "execute",
        parameters: options?.parameters,
      },
      "Failed to execute workflow"
    );
  }

  /**
   * Register to receive updates for an existing execution
   */
  registerForExecutionUpdates(executionId: string): void {
    this.sendJson(
      {
        type: "execute",
        executionId,
      },
      "Failed to register for execution updates"
    );
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private isConnectedOrConnecting(): boolean {
    return (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    );
  }

  getWorkflowId(): string {
    return this.workflowId;
  }
}

export const connectWorkflowWS = (
  orgHandle: string,
  workflowId: string,
  options: WorkflowWSOptions = {}
): WorkflowWebSocket => {
  const ws = new WorkflowWebSocket(orgHandle, workflowId, options);
  ws.connect();
  return ws;
};
