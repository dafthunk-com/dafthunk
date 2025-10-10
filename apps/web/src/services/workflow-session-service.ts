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
  onInit?: (state: WorkflowState) => void;
  onUpdate?: (state: WorkflowState) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  onOpen?: () => void;
  onExecutionUpdate?: (execution: WorkflowExecution) => void;
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
        this.options.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;

          if ("error" in message) {
            console.error("WebSocket error message:", message.error);
            this.options.onError?.(message.error || "");
          } else if (message.type === "init") {
            this.currentState = message.state;
            this.options.onInit?.(message.state);
          } else if (message.type === "update") {
            this.currentState = message.state;
            this.options.onUpdate?.(message.state);
          } else if (message.type === "execution_update") {
            this.options.onExecutionUpdate?.({
              id: message.executionId,
              workflowId: this.workflowId,
              status: message.status,
              nodeExecutions: message.nodeExecutions,
              error: message.error,
            });
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          this.options.onError?.("Failed to parse message");
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.options.onError?.("WebSocket connection error");
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed");
        this.options.onClose?.();

        if (
          this.shouldReconnect &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
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
      this.options.onError?.("Failed to create WebSocket connection");
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
      this.ws.send(JSON.stringify(updateMsg));
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
      this.options.onError?.("Failed to send message");
    }
  }

  /**
   * Helper method to send a message via WebSocket
   */
  private sendMessage(message: ClientMessage, errorMessage: string): boolean {
    if (!this.isConnected()) {
      console.warn(`WebSocket is not open, cannot send message`);
      this.options.onError?.("WebSocket is not connected");
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      this.options.onError?.(errorMessage);
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
