// Client -> Server
export type OnboardingClientMessage =
  | { type: "chat"; content: string }
  | { type: "list_conversations" }
  | { type: "new_conversation" }
  | { type: "switch_conversation"; conversationId: string }
  | { type: "delete_conversation"; conversationId: string };

// Server -> Client
export type OnboardingServerMessage =
  | { type: "history"; messages: OnboardingChatMessage[] }
  | { type: "conversations"; conversations: OnboardingConversation[] }
  | {
      type: "conversation_switched";
      conversationId: string;
      messages: OnboardingChatMessage[];
    }
  | { type: "stream_start" }
  | { type: "stream_chunk"; content: string }
  | { type: "stream_end" }
  | { type: "turn_complete"; content: string }
  | { type: "tool_progress"; tool: string; description: string }
  | { type: "error"; message: string };

export interface OnboardingChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface OnboardingConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}
