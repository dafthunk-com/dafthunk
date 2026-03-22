export interface ToolStep {
  tool: string;
  description: string;
}

// Client -> Server
export type AssistantClientMessage =
  | { type: "chat"; content: string }
  | { type: "list_conversations" }
  | { type: "new_conversation" }
  | { type: "switch_conversation"; conversationId: string }
  | { type: "delete_conversation"; conversationId: string };

// Server -> Client
export type AssistantServerMessage =
  | { type: "history"; messages: AssistantMessage[] }
  | { type: "conversations"; conversations: AssistantConversation[] }
  | {
      type: "conversation_switched";
      conversationId: string;
      messages: AssistantMessage[];
    }
  | { type: "stream_start" }
  | { type: "stream_chunk"; content: string }
  | { type: "stream_end" }
  | { type: "turn_complete"; content: string; toolSteps?: ToolStep[] }
  | { type: "tool_progress"; tool: string; description: string }
  | { type: "navigate"; path: string }
  | { type: "error"; message: string };

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  toolSteps?: ToolStep[];
}

export interface AssistantConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}
