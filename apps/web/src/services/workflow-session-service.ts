import type {
  ClientMessage,
  Edge,
  Node,
  ServerMessage,
  WorkflowExecution,
  WorkflowState,
  WorkflowUpdateMessage,
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
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.options.onConnectionOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;

          // Check for typed messages first
          if ("type" in message) {
            if (message.type === "init") {
              this.currentState = message.state;
              this.options.onInit?.(message.state);
            } else if (message.type === "update") {
              this.currentState = message.state;
              this.options.onUpdate?.(message.state);
            } else if (message.type === "execution_update") {
              // Execution updates are normal results, not errors
              // Even if execution.error is set, this is just a summary
              this.options.onExecutionUpdate?.({
                id: message.executionId,
                workflowId: this.workflowId,
                status: message.status,
                nodeExecutions: message.nodeExecutions,
                error: message.error,
              });
            }
          } else if ("error" in message) {
            // WorkflowErrorMessage - operational errors (no type field)
            // e.g., "Failed to execute workflow", "Workflow not initialized"
            console.error("Operational error from server:", message.error);
            this.options.onOperationalError?.(
              message.error || "Unknown error",
              message.details
            );
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          // Message parsing failure is an operational error, not a connection error
          this.options.onOperationalError?.("Failed to parse message");
        }
      };

      this.ws.onerror = (event) => {
        console.error("WebSocket connection error:", event);
        this.options.onConnectionError?.(event);
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        this.options.onConnectionClose?.(event);

        // Only reconnect for abnormal closures (not clean disconnects)
        // Code 1000 is normal closure, 1001 is going away
        const shouldAttemptReconnect =
          this.shouldReconnect &&
          this.reconnectAttempts < this.maxReconnectAttempts &&
          !event.wasClean &&
          event.code !== 1000 &&
          event.code !== 1001;

        if (shouldAttemptReconnect) {
          this.reconnectAttempts++;
          console.log(
            `Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
          );

          setTimeout(() => {
            this.connect();
          }, this.reconnectDelay);

          // Exponential backoff
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      // Connection creation failure is a connection-level error
      this.options.onConnectionError?.(
        new Event("error", { cancelable: false })
      );
    }
  }

  send(nodes: Node[], edges: Edge[]): void {
    if (!this.isConnected()) {
      console.warn("WebSocket is not open, cannot send message");
      return;
    }

    if (!this.currentState) {
      console.warn("No current state available, cannot send update");
      return;
    }

    try {
      const updatedState: WorkflowState = {
        ...this.currentState,
        nodes,
        edges,
        timestamp: Date.now(),
      };

      const updateMsg: WorkflowUpdateMessage = {
        type: "update",
        state: updatedState,
      };

      this.currentState = updatedState;
      this.ws?.send(JSON.stringify(updateMsg));
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
      // Send failure is an operational error (bad state/data), not connection error
      this.options.onOperationalError?.("Failed to send message");
    }
  }

  /**
   * Helper method to send a message via WebSocket
   */
  private sendMessage(message: ClientMessage, errorMessage: string): boolean {
    if (!this.isConnected()) {
      console.warn(`WebSocket is not open, cannot send message`);
      // Not being connected is an operational issue, not a connection error
      this.options.onOperationalError?.("WebSocket is not connected");
      return false;
    }

    try {
      this.ws?.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      // Send failure is an operational error
      this.options.onOperationalError?.(errorMessage);
      return false;
    }
  }

  /**
   * Execute workflow and receive realtime updates via WebSocket
   */
  executeWorkflow(options?: { parameters?: Record<string, unknown> }): void {
    this.sendMessage(
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
    this.sendMessage(
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
