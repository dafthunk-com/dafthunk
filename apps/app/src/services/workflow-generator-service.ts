import type {
  GeneratorClientMessage,
  GeneratorServerMessage,
} from "@dafthunk/types";

import { getApiBaseUrl } from "@/config/api";

export interface WorkflowGeneratorWSOptions {
  /**
   * Every server frame, in order. A single callback rather than one per frame
   * type — the page reduces frames into state, and twelve optional callbacks
   * would be a worse surface for the same thing.
   */
  onFrame?: (frame: GeneratorServerMessage) => void;
  onConnectionError?: (event: Event) => void;
}

/**
 * Socket client for workflow generation.
 *
 * Modelled on `WorkflowWebSocket`, with one deliberate difference: it never
 * re-sends `start` after a reconnect. The server keeps a frame log and replays
 * it on connect, so resending would risk a second run rather than catching up.
 */
export class WorkflowGeneratorWebSocket {
  private static readonly NORMAL_CLOSURE = 1000;
  private static readonly GOING_AWAY = 1001;
  private static readonly MAX_RECONNECT_DELAY = 30000;

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private shouldReconnect = true;
  /** Set once `start` has been sent for this session; never sent twice. */
  private hasStarted = false;
  private pendingPrompt: string | null = null;

  constructor(
    private orgId: string,
    private sessionId: string,
    private options: WorkflowGeneratorWSOptions = {}
  ) {}

  connect(): void {
    if (this.isConnectedOrConnecting()) return;

    const wsBaseUrl = getApiBaseUrl().replace(/^http/, "ws");
    const url = `${wsBaseUrl}/${this.orgId}/generate/${this.sessionId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        // A prompt submitted before the socket opened is flushed here.
        if (this.pendingPrompt !== null && !this.hasStarted) {
          const prompt = this.pendingPrompt;
          this.pendingPrompt = null;
          this.start(prompt);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          this.options.onFrame?.(
            JSON.parse(event.data as string) as GeneratorServerMessage
          );
        } catch (error) {
          console.error("[GeneratorWS] Malformed frame:", error);
        }
      };

      this.ws.onerror = (event) => {
        console.error("[GeneratorWS] Connection error:", event);
        this.options.onConnectionError?.(event);
      };

      this.ws.onclose = (event) => {
        if (this.shouldAttemptReconnect(event)) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), this.reconnectDelay);
          this.reconnectDelay = Math.min(
            this.reconnectDelay * 2,
            WorkflowGeneratorWebSocket.MAX_RECONNECT_DELAY
          );
        }
      };
    } catch (error) {
      console.error("[GeneratorWS] Failed to create WebSocket:", error);
      this.options.onConnectionError?.(
        new Event("error", { cancelable: false })
      );
    }
  }

  private shouldAttemptReconnect(event: CloseEvent): boolean {
    return (
      this.shouldReconnect &&
      this.reconnectAttempts < this.maxReconnectAttempts &&
      !event.wasClean &&
      event.code !== WorkflowGeneratorWebSocket.NORMAL_CLOSURE &&
      event.code !== WorkflowGeneratorWebSocket.GOING_AWAY
    );
  }

  private send(message: GeneratorClientMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(message));
  }

  /** Queues the prompt when the socket is not open yet. */
  start(prompt: string): void {
    if (this.hasStarted) return;

    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.pendingPrompt = prompt;
      return;
    }

    this.hasStarted = true;
    this.send({ type: "start", prompt });
  }

  cancel(): void {
    this.send({ type: "cancel" });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close(WorkflowGeneratorWebSocket.NORMAL_CLOSURE);
      this.ws = null;
    }
  }

  private isConnectedOrConnecting(): boolean {
    return (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    );
  }
}

export const connectWorkflowGeneratorWS = (
  orgId: string,
  sessionId: string,
  options: WorkflowGeneratorWSOptions = {}
): WorkflowGeneratorWebSocket => {
  const ws = new WorkflowGeneratorWebSocket(orgId, sessionId, options);
  ws.connect();
  return ws;
};
