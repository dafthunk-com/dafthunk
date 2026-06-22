import type {
  MailboxMessageSummary,
  MailboxThreadSummary,
} from "@dafthunk/types";
import Inbox from "lucide-react/icons/inbox";
import Paperclip from "lucide-react/icons/paperclip";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
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

  const { email, isEmailLoading, emailError } = useEmail(emailId || null);
  const { threads, isThreadsLoading, threadsError } = useMailboxThreads(
    emailId || null
  );

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

  if (isEmailLoading) {
    return <InsetLoading title="Inbox" />;
  }
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
    >
      <div className="text-sm text-muted-foreground max-w-2xl mb-6">
        A read-only history of the conversations your workflows have recorded
        for this address.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-6 min-h-[60vh]">
        <ThreadList
          threads={threads}
          isLoading={isThreadsLoading}
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

function ThreadList({
  threads,
  isLoading,
  error,
  activeThreadId,
  onSelect,
}: {
  threads: MailboxThreadSummary[];
  isLoading: boolean;
  error: Error | null;
  activeThreadId: string | null;
  onSelect: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" /> Loading conversations…
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load conversations: {error.message}
      </p>
    );
  }
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-2 py-12 text-muted-foreground border rounded-lg">
        <Inbox className="size-6" />
        <p className="text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col border rounded-lg divide-y overflow-hidden">
      {threads.map((thread) => {
        const isActive = thread.id === activeThreadId;
        return (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelect(thread.id)}
            className={cn(
              "text-left px-3 py-2.5 hover:bg-muted/60 transition-colors",
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
    </div>
  );
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

  if (!threadId) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
        Select a conversation to read it.
      </div>
    );
  }
  if (isThreadLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" /> Loading conversation…
      </div>
    );
  }
  if (threadError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load conversation: {threadError.message}
      </p>
    );
  }

  return (
    <div className="border rounded-lg p-4 overflow-hidden">
      <div className="mb-4 pb-4 border-b">
        <h2 className="text-lg font-semibold">
          {thread?.subject || "(no subject)"}
        </h2>
        <p className="text-sm text-muted-foreground">{thread?.fromEmail}</p>
      </div>
      <div className="flex flex-col gap-6">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            orgId={orgId}
            emailId={emailId}
          />
        ))}
      </div>
    </div>
  );
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
