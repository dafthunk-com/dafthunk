import type {
  OnboardingChatMessage,
  OnboardingConversation,
} from "@dafthunk/types";
import ArrowUp from "lucide-react/icons/arrow-up";
import ChevronDown from "lucide-react/icons/chevron-down";
import Loader from "lucide-react/icons/loader";
import PanelRightClose from "lucide-react/icons/panel-right-close";
import PanelRightOpen from "lucide-react/icons/panel-right-open";
import PenSquare from "lucide-react/icons/pen-square";
import Trash2 from "lucide-react/icons/trash-2";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Link, useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOnboardingChat } from "@/hooks/use-onboarding-chat";
import { cn } from "@/utils/utils";

import { useAssistant } from "./assistant-provider";

export function AssistantSidebar() {
  const { isOpen, open, close } = useAssistant();
  const { organization } = useAuth();
  const orgId = organization?.id ?? "";
  const navigate = useNavigate();

  const onNavigate = (path: string) => {
    const resolvedPath = path.startsWith("/") ? path : `/org/${orgId}/${path}`;
    navigate(resolvedPath);
  };

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
  } = useOnboardingChat(orgId, isOpen, onNavigate);

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

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  if (!orgId) return null;

  if (!isOpen) {
    return (
      <div className="shrink-0 w-16 bg-sidebar text-sidebar-foreground flex flex-col items-center p-2">
        <button
          type="button"
          onClick={open}
          className="flex items-center justify-center size-8 rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <PanelRightOpen className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 flex flex-col w-[400px] pr-2 pb-2">
      <div className="flex-1 flex flex-col bg-sidebar text-sidebar-foreground rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-12 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={newConversation}
          disabled={!isConnected}
        >
          <PenSquare className="size-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-between min-w-0 font-normal"
            >
              <span className="truncate">
                {activeConversation?.title ?? "New conversation"}
              </span>
              <ChevronDown className="size-3.5 shrink-0 ml-1 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {conversations.map((conv) => (
              <ConversationDropdownItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={() => switchConversation(conv.id)}
                onDelete={() => deleteConversation(conv.id)}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={close}
        >
          <PanelRightClose className="size-4" />
        </Button>
      </div>
      <div className="mx-4 border-b" />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-sm font-medium mb-1">
                What would you like to automate?
              </p>
              <p className="text-xs">I'll help you set up your workflow.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {isStreaming && !currentStreamContent && !toolProgress && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader className="size-3 animate-spin" />
              Thinking...
            </div>
          )}

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

      {/* Input */}
      <div className="px-3 pb-3 pt-2">
        <div className="relative rounded-2xl border bg-background shadow-sm">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Reply..." : "Connecting..."}
            disabled={!isConnected || isStreaming}
            rows={1}
            className="w-full resize-none bg-transparent px-3 pt-3 pb-10 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <div className="absolute bottom-2 right-2">
            <Button
              type="button"
              size="icon"
              className="size-7 rounded-lg"
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
  );
}

function ConversationDropdownItem({
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
    <DropdownMenuItem
      className={cn("group flex items-center gap-1", isActive && "bg-muted")}
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
    </DropdownMenuItem>
  );
}

function ChatMessage({ message }: { message: OnboardingChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="rounded-2xl bg-background px-4 py-2 text-sm max-w-[85%]">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md text-sm leading-relaxed">
      <Markdown components={{ a: MarkdownLink }}>{message.content}</Markdown>
    </div>
  );
}

function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  if (!href) return <>{children}</>;

  const isInternal =
    href.startsWith("/") ||
    href.startsWith(window.location.origin);
  const to = isInternal
    ? href.replace(window.location.origin, "")
    : href;

  if (isInternal) {
    return (
      <Link to={to} className="underline">
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
      {children}
    </a>
  );
}
