import type {
  OnboardingChatMessage,
  OnboardingConversation,
} from "@dafthunk/types";
import { useCallback, useEffect, useRef, useState } from "react";

import { OnboardingChatWebSocket } from "@/services/onboarding-chat-service";

export function useOnboardingChat(orgId: string, active: boolean) {
  const [messages, setMessages] = useState<OnboardingChatMessage[]>([]);
  const [conversations, setConversations] = useState<OnboardingConversation[]>(
    []
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const [toolProgress, setToolProgress] = useState<string | null>(null);

  const wsRef = useRef<OnboardingChatWebSocket | null>(null);

  useEffect(() => {
    if (!active || !orgId) return;

    const ws = new OnboardingChatWebSocket(orgId, {
      onHistory: (history) => setMessages(history),
      onConversations: (convs) => setConversations(convs),
      onConversationSwitched: (convId, msgs) => {
        setActiveConversationId(convId);
        setMessages(msgs);
        setCurrentStreamContent("");
        setIsStreaming(false);
        setToolProgress(null);
      },
      onStreamStart: () => {
        setIsStreaming(true);
        setCurrentStreamContent("");
        setToolProgress(null);
      },
      onStreamChunk: (content) => {
        setCurrentStreamContent((prev) => prev + content);
      },
      onStreamEnd: () => {
        setCurrentStreamContent("");
      },
      onTurnComplete: (content) => {
        setMessages((msgs) => [
          ...msgs,
          { role: "assistant", content, timestamp: Date.now() },
        ]);
        setCurrentStreamContent("");
        setIsStreaming(false);
        setToolProgress(null);
      },
      onToolProgress: (_tool, description) => {
        setToolProgress(description);
      },
      onError: (message) => {
        console.error("[OnboardingChat] Error:", message);
        setIsStreaming(false);
      },
      onConnectionOpen: () => setIsConnected(true),
      onConnectionClose: () => setIsConnected(false),
    });

    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [orgId, active]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current?.isConnected()) return;
    const userMsg: OnboardingChatMessage = {
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    wsRef.current.sendMessage(content);
  }, []);

  const newConversation = useCallback(() => {
    wsRef.current?.newConversation();
  }, []);

  const switchConversation = useCallback((conversationId: string) => {
    wsRef.current?.switchConversation(conversationId);
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    wsRef.current?.deleteConversation(conversationId);
  }, []);

  return {
    messages,
    conversations,
    activeConversationId,
    isStreaming,
    isConnected,
    currentStreamContent,
    toolProgress,
    sendMessage,
    newConversation,
    switchConversation,
    deleteConversation,
  };
}
