import type {
  OnboardingChatMessage,
  OnboardingConversation,
} from "@dafthunk/types";
import ArrowUp from "lucide-react/icons/arrow-up";
import Loader from "lucide-react/icons/loader";
import PenSquare from "lucide-react/icons/pen-square";
import Trash2 from "lucide-react/icons/trash-2";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { useOnboardingChat } from "@/hooks/use-onboarding-chat";
import { cn } from "@/utils/utils";

export function OnboardingChatPage() {
  const { organization } = useAuth();
  const orgId = organization?.id ?? "";
  const {
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
  } = useOnboardingChat(orgId, true);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamContent, toolProgress]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col shrink-0">
        <div className="p-3 border-b">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={newConversation}
            disabled={!isConnected}
          >
            <PenSquare className="mr-2 size-3.5" />
            New conversation
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              onSelect={() => switchConversation(conv.id)}
              onDelete={() => deleteConversation(conv.id)}
            />
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
            {messages.length === 0 && !isStreaming && (
              <div className="text-center text-muted-foreground py-24">
                <p className="text-lg font-medium mb-1">
                  What would you like to automate?
                </p>
                <p className="text-sm">
                  I'll help you set up your first workflow.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}

            {toolProgress && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader className="size-3 animate-spin" />
                {toolProgress}
              </div>
            )}

            {isStreaming && currentStreamContent && (
              <div className="md text-sm leading-relaxed">
                <Markdown>{currentStreamContent}</Markdown>
                <span className="inline-block w-1.5 h-4 bg-foreground/40 animate-pulse ml-0.5 -mb-0.5" />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl border bg-background shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isConnected ? "Reply..." : "Connecting..."}
                disabled={!isConnected || isStreaming}
                rows={1}
                className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  type="button"
                  size="icon"
                  className="size-8 rounded-lg"
                  disabled={!isConnected || isStreaming || !input.trim()}
                  onClick={handleSubmit}
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: {
  conversation: OnboardingConversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50",
        isActive && "bg-muted"
      )}
      onClick={onSelect}
    >
      <span className="flex-1 truncate">{conversation.title}</span>
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-muted-foreground/10 text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

function ChatMessage({ message }: { message: OnboardingChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="rounded-3xl bg-muted px-5 py-2.5 text-sm max-w-[80%]">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md text-sm leading-relaxed">
      <Markdown>{message.content}</Markdown>
    </div>
  );
}
