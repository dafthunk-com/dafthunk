import type {
  MailboxMessageSummary,
  MailboxThreadSummary,
} from "@dafthunk/types";
import Inbox from "lucide-react/icons/inbox";
import Paperclip from "lucide-react/icons/paperclip";
import type { ReactNode, RefObject } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Spinner } from "@/components/ui/spinner";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useEmail } from "@/services/email-service";
import {
  fetchMailboxMessageBody,
  mailboxAttachmentUrl,
  useMailboxThread,
  useMailboxThreads,
} from "@/services/mailbox-service";
import { cn } from "@/utils/utils";

export function EmailInboxPage() {
  const { emailId } = useParams<{ emailId: string }>();
  const { organization } = useAuth();
  const orgId = organization?.id || "";

  const { email, emailError } = useEmail(emailId || null);
  const {
    threads,
    isThreadsLoading,
    isThreadsLoadingMore,
    isThreadsReachingEnd,
    threadsObserverTargetRef,
    threadsError,
  } = useMailboxThreads(emailId || null);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  // Default the selection to the most recent conversation once threads load.
  const activeThreadId = selectedThreadId ?? threads[0]?.id ?? null;

  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  useEffect(() => {
    setBreadcrumbs([
      { label: "Emails", to: `/org/${orgId}/emails` },
      { label: email?.name || "Inbox" },
    ]);
  }, [setBreadcrumbs, orgId, email?.name]);

  if (emailError) {
    return <InsetError title="Inbox" errorMessage={emailError.message} />;
  }

  return (
    <InsetLayout
      title={email?.name || "Inbox"}
      titleRight={
        email ? (
          <span className="text-sm text-muted-foreground">{email.address}</span>
        ) : null
      }
      childrenClassName="h-full flex flex-col"
    >
      <div className="text-sm text-muted-foreground max-w-2xl mb-6">
        A read-only history of the conversations your workflows have recorded
        for this address.
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-6">
        <ThreadList
          threads={threads}
          isLoading={isThreadsLoading}
          isLoadingMore={isThreadsLoadingMore}
          isReachingEnd={isThreadsReachingEnd}
          observerTargetRef={threadsObserverTargetRef}
          error={threadsError}
          activeThreadId={activeThreadId}
          onSelect={setSelectedThreadId}
        />
        <ThreadDetail
          orgId={orgId}
          emailId={emailId || ""}
          threadId={activeThreadId}
        />
      </div>
    </InsetLayout>
  );
}

// Shared full-height panel chrome. The bordered, white box is always rendered
// at the pane's full size so loading/empty/error states fill it instead of
// collapsing to a line of text. Grid `stretch` gives it height on desktop.
const PANEL_CLASS =
  "min-h-0 flex flex-col border rounded-lg overflow-hidden bg-card";

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground p-6">
      {children}
    </div>
  );
}

function ThreadList({
  threads,
  isLoading,
  isLoadingMore,
  isReachingEnd,
  observerTargetRef,
  error,
  activeThreadId,
  onSelect,
}: {
  threads: MailboxThreadSummary[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isReachingEnd: boolean;
  observerTargetRef: RefObject<HTMLDivElement | null>;
  error: Error | null;
  activeThreadId: string | null;
  onSelect: (id: string) => void;
}) {
  let content: ReactNode;
  if (isLoading) {
    content = (
      <PanelMessage>
        <span className="flex items-center gap-2">
          <Spinner className="size-4" /> Loading conversations…
        </span>
      </PanelMessage>
    );
  } else if (error) {
    content = (
      <PanelMessage>
        <span className="text-destructive">
          Failed to load conversations: {error.message}
        </span>
      </PanelMessage>
    );
  } else if (threads.length === 0) {
    content = (
      <PanelMessage>
        <Inbox className="size-6" />
        <span>No conversations yet</span>
      </PanelMessage>
    );
  } else {
    content = (
      <div className="flex-1 min-h-0 overflow-y-auto divide-y">
        {threads.map((thread) => {
          const isActive = thread.id === activeThreadId;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelect(thread.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors",
                isActive && "bg-muted"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm truncate">
                  {thread.subject || "(no subject)"}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDate(thread.lastMessageAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {thread.fromEmail}
              </p>
            </button>
          );
        })}
        {/* Sentinel: scrolling this into view loads the next page. */}
        {!isReachingEnd && (
          <div
            ref={observerTargetRef}
            className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"
          >
            {isLoadingMore && <Spinner className="size-3" />}
            {isLoadingMore ? "Loading more…" : ""}
          </div>
        )}
      </div>
    );
  }

  return <div className={PANEL_CLASS}>{content}</div>;
}

function ThreadDetail({
  orgId,
  emailId,
  threadId,
}: {
  orgId: string;
  emailId: string;
  threadId: string | null;
}) {
  const { thread, messages, isThreadLoading, threadError } = useMailboxThread(
    emailId || null,
    threadId
  );

  let content: ReactNode;
  if (!threadId) {
    content = <PanelMessage>Select a conversation to read it.</PanelMessage>;
  } else if (isThreadLoading) {
    content = (
      <PanelMessage>
        <span className="flex items-center gap-2">
          <Spinner className="size-4" /> Loading conversation…
        </span>
      </PanelMessage>
    );
  } else if (threadError) {
    content = (
      <PanelMessage>
        <span className="text-destructive">
          Failed to load conversation: {threadError.message}
        </span>
      </PanelMessage>
    );
  } else {
    content = (
      <>
        <div className="shrink-0 px-4 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {thread?.subject || "(no subject)"}
          </h2>
          <p className="text-sm text-muted-foreground">{thread?.fromEmail}</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-6">
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              orgId={orgId}
              emailId={emailId}
            />
          ))}
        </div>
      </>
    );
  }

  return <div className={PANEL_CLASS}>{content}</div>;
}

function MessageCard({
  message,
  orgId,
  emailId,
}: {
  message: MailboxMessageSummary;
  orgId: string;
  emailId: string;
}) {
  const isInbound = message.direction === "inbound";
  const [body, setBody] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [showQuoted, setShowQuoted] = useState(false);

  const preferredPart = useMemo<"text" | "html" | null>(() => {
    if (message.hasText) return "text";
    if (message.hasHtml) return "html";
    return null;
  }, [message.hasText, message.hasHtml]);

  useEffect(() => {
    let cancelled = false;
    setBody(null);
    setBodyError(null);
    if (!preferredPart) return;
    fetchMailboxMessageBody(orgId, emailId, message.id, preferredPart)
      .then((text) => {
        if (!cancelled) setBody(text);
      })
      .catch((e) => {
        if (!cancelled)
          setBodyError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, emailId, message.id, preferredPart]);

  const { visible, quoted } =
    body && preferredPart === "text"
      ? splitQuotedText(body)
      : { visible: body ?? "", quoted: "" };

  return (
    <div className={cn("pl-4", !isInbound && "border-l-2 border-l-primary")}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-medium text-sm">
          {isInbound ? message.fromEmail : `${message.fromEmail} (sent)`}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDate(message.createdAt)}
        </span>
      </div>

      <div className="text-sm">
        {bodyError && (
          <p className="text-muted-foreground italic text-xs" title={bodyError}>
            Message body unavailable
          </p>
        )}
        {!bodyError && !preferredPart && (
          <p className="text-muted-foreground italic text-xs">(no body)</p>
        )}
        {!bodyError && preferredPart === "text" && (
          <>
            <pre className="whitespace-pre-wrap font-sans">
              {body === null ? "Loading…" : visible}
            </pre>
            {quoted && (
              <>
                <button
                  type="button"
                  onClick={() => setShowQuoted((v) => !v)}
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showQuoted
                    ? "‹ Hide trimmed content"
                    : "› Show trimmed content"}
                </button>
                {showQuoted && (
                  <pre className="whitespace-pre-wrap font-sans text-muted-foreground mt-2 border-l-2 border-l-neutral-200 dark:border-l-neutral-700 pl-3">
                    {quoted}
                  </pre>
                )}
              </>
            )}
          </>
        )}
        {!bodyError && preferredPart === "html" && (
          <HtmlBodyFrame html={body} />
        )}
      </div>

      {message.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {message.attachments.map((a) => (
            <a
              key={a.id}
              href={mailboxAttachmentUrl(orgId, emailId, a.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs border rounded px-2 py-1 hover:bg-muted"
            >
              <Paperclip className="size-3" />
              <span>{a.filename}</span>
              <span className="text-muted-foreground">
                ({formatBytes(a.sizeBytes)})
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function HtmlBodyFrame({ html }: { html: string | null }) {
  if (html === null) {
    return <p className="text-muted-foreground text-xs">Loading…</p>;
  }
  // Email HTML is untrusted; render in a fully sandboxed iframe so it can
  // neither run scripts nor escape into the app.
  return (
    <iframe
      title="Email HTML body"
      sandbox=""
      srcDoc={html}
      className="w-full min-h-[200px] border-0"
    />
  );
}

function formatDate(value: number): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Matches Gmail-style attribution lines across the common locales we see.
const ATTRIBUTION_RE =
  /^On .+ (wrote|écrivait|schrieb|escribió|skrev|scrisse|napisał|napisał\(a\)):\s*$/m;

/**
 * Split an email body into the new content and the quoted tail so the UI can
 * collapse the latter behind a toggle. Falls back to the first run of two or
 * more consecutive `>`-prefixed lines when no attribution line is present.
 */
function splitQuotedText(body: string): { visible: string; quoted: string } {
  const attribution = body.match(ATTRIBUTION_RE);
  if (attribution && attribution.index !== undefined) {
    return {
      visible: body.slice(0, attribution.index).trimEnd(),
      quoted: body.slice(attribution.index),
    };
  }
  const lines = body.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith(">") && lines[i + 1].startsWith(">")) {
      return {
        visible: lines.slice(0, i).join("\n").trimEnd(),
        quoted: lines.slice(i).join("\n"),
      };
    }
  }
  return { visible: body, quoted: "" };
}
