import type {
  AssistantMessage,
  AssistantConversation,
  ToolStep,
} from "@dafthunk/types";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { AssistantWebSocket } from "@/services/assistant-service";

const STORAGE_KEY = "assistant-open";

// Stable actions context — rarely changes, safe for lightweight consumers
interface AssistantActions {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

// Full chat state context — changes frequently during streaming
interface AssistantChatState {
  messages: AssistantMessage[];
  conversations: AssistantConversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  isConnected: boolean;
  currentStreamContent: string;
  toolSteps: ToolStep[];
  sendMessage: (content: string) => void;
  newConversation: () => void;
  switchConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
}

const ActionsContext = createContext<AssistantActions | null>(null);
const ChatStateContext = createContext<AssistantChatState | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  // ── Panel open/close state ──────────────────────────────────────
  const [isOpen, setIsOpen] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === "true"
  );

  const setOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setIsOpen((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        sessionStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
    },
    []
  );

  const toggle = useCallback(() => setOpen((prev) => !prev), [setOpen]);
  const open = useCallback(() => setOpen(true), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);

  const actions = useMemo(
    () => ({ isOpen, toggle, open, close }),
    [isOpen, toggle, open, close]
  );

  // ── Chat state ──────────────────────────────────────────────────
  const { organization } = useAuth();
  const orgId = organization?.id ?? "";
  const navigate = useNavigate();

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversations, setConversations] = useState<AssistantConversation[]>(
    []
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const [toolSteps, setToolSteps] = useState<ToolStep[]>([]);

  const wsRef = useRef<AssistantWebSocket | null>(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const orgIdRef = useRef(orgId);
  orgIdRef.current = orgId;

  useEffect(() => {
    if (!isOpen || !orgId) return;

    const ws = new AssistantWebSocket(orgId, {
      onHistory: (history) => setMessages(history),
      onConversations: (convs) => setConversations(convs),
      onConversationSwitched: (convId, msgs) => {
        setActiveConversationId(convId);
        setMessages(msgs);
        setCurrentStreamContent("");
        setIsStreaming(false);
        setToolSteps([]);
      },
      onStreamStart: () => {
        setIsStreaming(true);
        setCurrentStreamContent("");
      },
      onStreamChunk: (content) => {
        setCurrentStreamContent((prev) => prev + content);
      },
      onTurnComplete: (content, serverToolSteps) => {
        if (content) {
          setMessages((msgs) => [
            ...msgs,
            {
              role: "assistant",
              content,
              timestamp: Date.now(),
              toolSteps: serverToolSteps,
            },
          ]);
        }
        setCurrentStreamContent("");
        setIsStreaming(false);
        setToolSteps([]);
      },
      onToolProgress: (tool, description) => {
        setToolSteps((prev) => [...prev, { tool, description }]);
      },
      onNavigate: (path) => {
        const id = orgIdRef.current;
        const resolved = path.startsWith("/") ? path : `/org/${id}/${path}`;
        navigateRef.current(resolved);
      },
      onError: (message) => {
        console.error("[Assistant] Error:", message);
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
  }, [orgId, isOpen]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current?.isConnected()) return;
    const userMsg: AssistantMessage = {
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setToolSteps([]);
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

  return (
    <ActionsContext.Provider value={actions}>
      <ChatStateContext.Provider
        value={{
          messages,
          conversations,
          activeConversationId,
          isStreaming,
          isConnected,
          currentStreamContent,
          toolSteps,
          sendMessage,
          newConversation,
          switchConversation,
          deleteConversation,
        }}
      >
        {children}
      </ChatStateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** Stable actions — only re-renders when isOpen changes. Use for buttons/toggles. */
export function useAssistant() {
  const ctx = useContext(ActionsContext);
  if (!ctx) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return ctx;
}

/** Full chat state — re-renders on every stream chunk. Use only in the sidebar. */
export function useAssistantChat() {
  const ctx = useContext(ChatStateContext);
  if (!ctx) {
    throw new Error(
      "useAssistantChat must be used within an AssistantProvider"
    );
  }
  return ctx;
}
