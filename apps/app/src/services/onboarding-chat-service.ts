import type {
  OnboardingChatMessage,
  OnboardingClientMessage,
  OnboardingConversation,
  OnboardingServerMessage,
} from "@dafthunk/types";

import { getApiBaseUrl } from "@/config/api";

export interface OnboardingChatWSOptions {
  onHistory?: (messages: OnboardingChatMessage[]) => void;
  onConversations?: (conversations: OnboardingConversation[]) => void;
  onConversationSwitched?: (
    conversationId: string,
    messages: OnboardingChatMessage[]
  ) => void;
  onStreamStart?: () => void;
  onStreamChunk?: (content: string) => void;
  onStreamEnd?: () => void;
  onTurnComplete?: (content: string) => void;
  onToolProgress?: (tool: string, description: string) => void;
  onNavigate?: (path: string) => void;
  onError?: (message: string) => void;
  onConnectionOpen?: () => void;
  onConnectionClose?: (event: CloseEvent) => void;
}

export class OnboardingChatWebSocket {
  private static readonly NORMAL_CLOSURE = 1000;
  private static readonly GOING_AWAY = 1001;
  private static readonly MAX_RECONNECT_DELAY = 30000;

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private shouldReconnect = true;

  constructor(
    private orgId: string,
    private options: OnboardingChatWSOptions = {}
  ) {}

  connect(): void {
    if (this.isConnectedOrConnecting()) return;

    const apiBaseUrl = getApiBaseUrl();
    const wsBaseUrl = apiBaseUrl.replace(/^http/, "ws");
    const url = `${wsBaseUrl}/${this.orgId}/onboarding`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.options.onConnectionOpen?.();
      };

      this.ws.onmessage = (event) => this.handleMessage(event);

      this.ws.onerror = () => {
        this.options.onError?.("Connection error");
      };

      this.ws.onclose = (event) => {
        this.options.onConnectionClose?.(event);

        if (this.shouldAttemptReconnect(event)) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), this.reconnectDelay);
          this.reconnectDelay = Math.min(
            this.reconnectDelay * 2,
            OnboardingChatWebSocket.MAX_RECONNECT_DELAY
          );
        }
      };
    } catch (error) {
      console.error("[OnboardingChat] Failed to create WebSocket:", error);
      this.options.onError?.("Failed to connect");
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as OnboardingServerMessage;

      switch (message.type) {
        case "history":
          this.options.onHistory?.(message.messages);
          break;
        case "conversations":
          this.options.onConversations?.(message.conversations);
          break;
        case "conversation_switched":
          this.options.onConversationSwitched?.(
            message.conversationId,
            message.messages
          );
          break;
        case "stream_start":
          this.options.onStreamStart?.();
          break;
        case "stream_chunk":
          this.options.onStreamChunk?.(message.content);
          break;
        case "stream_end":
          this.options.onStreamEnd?.();
          break;
        case "turn_complete":
          this.options.onTurnComplete?.(message.content);
          break;
        case "tool_progress":
          this.options.onToolProgress?.(message.tool, message.description);
          break;
        case "navigate":
          this.options.onNavigate?.(message.path);
          break;
        case "error":
          this.options.onError?.(message.message);
          break;
      }
    } catch (error) {
      console.error("[OnboardingChat] Failed to parse message:", error);
    }
  }

  private shouldAttemptReconnect(event: CloseEvent): boolean {
    return (
      this.shouldReconnect &&
      this.reconnectAttempts < this.maxReconnectAttempts &&
      !event.wasClean &&
      event.code !== OnboardingChatWebSocket.NORMAL_CLOSURE &&
      event.code !== OnboardingChatWebSocket.GOING_AWAY
    );
  }

  private send(message: OnboardingClientMessage): void {
    if (!this.isConnected()) return;
    this.ws?.send(JSON.stringify(message));
  }

  sendMessage(content: string): void {
    this.send({ type: "chat", content });
  }

  newConversation(): void {
    this.send({ type: "new_conversation" });
  }

  switchConversation(conversationId: string): void {
    this.send({ type: "switch_conversation", conversationId });
  }

  deleteConversation(conversationId: string): void {
    this.send({ type: "delete_conversation", conversationId });
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
}
