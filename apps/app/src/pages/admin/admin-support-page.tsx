import Inbox from "lucide-react/icons/inbox";
import Paperclip from "lucide-react/icons/paperclip";
import PenSquare from "lucide-react/icons/pen-square";
import Send from "lucide-react/icons/send";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { InsetError } from "@/components/inset-error";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminMessageDirection,
  type AdminThreadMessage,
  type AdminThreadStatus,
  type AdminThreadSummary,
  type AdminUser,
  adminSupportAttachmentUrl,
  createAdminSupportThread,
  fetchAdminSupportMessageBody,
  sendAdminSupportReply,
  updateAdminSupportThreadStatus,
  useAdminSupportThread,
  useAdminSupportThreads,
  useAdminSupportUnreadCount,
  useAdminUsers,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/utils";

const STATUS_FILTERS: { value: AdminThreadStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
];

export function AdminSupportPage() {
  const setBreadcrumbs = useBreadcrumbsSetter();
  useEffect(() => {
    setBreadcrumbs([{ label: "Support" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AdminThreadStatus | "all">(
    "all"
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const limit = 30;

  const { threads, pagination, threadsError, isThreadsLoading, mutateThreads } =
    useAdminSupportThreads(
      page,
      limit,
      statusFilter === "all" ? undefined : statusFilter,
      search || undefined
    );
  const { mutateUnreadCount } = useAdminSupportUnreadCount();

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    if (threads.length === 0) return;
    const stillVisible = threads.some((t) => t.id === selectedThreadId);
    if (!stillVisible) setSelectedThreadId(threads[0].id);
  }, [threads, selectedThreadId]);

  if (threadsError) {
    return <InsetError title="Support" errorMessage={threadsError.message} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2 px-4 py-2 border-b sm:flex-row sm:items-center">
        <form
          className="flex gap-2 flex-1 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput);
            setPage(1);
          }}
        >
          <SearchInput
            placeholder="Search by subject or sender…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </form>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as AdminThreadStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ComposeThreadDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onCreated={(thread) => {
          mutateThreads();
          mutateUnreadCount();
          setSelectedThreadId(thread.id);
        }}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-0">
        <ThreadList
          threads={threads}
          isLoading={isThreadsLoading}
          selectedThreadId={selectedThreadId}
          onSelect={setSelectedThreadId}
          onCompose={() => setComposeOpen(true)}
          pagination={pagination}
          page={page}
          onPageChange={setPage}
        />

        <div className="overflow-hidden">
          {selectedThreadId ? (
            <ThreadDetail
              threadId={selectedThreadId}
              onMutated={() => {
                mutateThreads();
                mutateUnreadCount();
              }}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadList({
  threads,
  isLoading,
  selectedThreadId,
  onSelect,
  onCompose,
  pagination,
  page,
  onPageChange,
}: {
  threads: AdminThreadSummary[];
  isLoading: boolean;
  selectedThreadId: string | null;
  onSelect: (id: string) => void;
  onCompose: () => void;
  pagination: { total: number; totalPages: number } | null;
  page: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden lg:border-r">
      <div className="p-2">
        <Button size="sm" className="w-full" onClick={onCompose}>
          <PenSquare className="h-4 w-4 mr-2" />
          New thread
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && threads.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        )}
        {!isLoading && threads.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground text-center">
            No threads
          </div>
        )}
        <ul>
          {threads.map((t) => {
            const isSelected = t.id === selectedThreadId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-l-2 border-l-transparent hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50 transition-colors",
                    isSelected &&
                      "bg-neutral-100 dark:bg-neutral-800 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <SenderAvatar
                      name={t.fromName || t.userName || t.fromEmail}
                      avatarUrl={t.userAvatarUrl}
                      linked={Boolean(t.userId)}
                      className="h-9 w-9 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {t.unread && (
                            <span
                              className="h-2 w-2 rounded-full bg-blue-600 shrink-0"
                              aria-label="Unread"
                            />
                          )}
                          <div
                            className={cn(
                              "truncate text-sm",
                              t.unread ? "font-semibold" : "font-medium"
                            )}
                          >
                            {t.fromName || t.userName || t.fromEmail}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(t.lastMessageAt)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "text-sm truncate",
                          t.unread
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {t.subject || "(no subject)"}
                      </div>
                      {t.userId && t.organizationId && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {t.organizationName ?? t.userName}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="px-3 py-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {pagination.total} total
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThreadDetail({
  threadId,
  onMutated,
}: {
  threadId: string;
  onMutated: () => void;
}) {
  const { thread, messages, threadError, isThreadLoading, mutateThread } =
    useAdminSupportThread(threadId);

  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Reset the composer when switching threads.
  useEffect(() => {
    setReplyText("");
  }, [threadId]);

  if (isThreadLoading && !thread) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading thread…</div>
    );
  }
  if (threadError) {
    return (
      <div className="p-6 text-sm text-red-600">{threadError.message}</div>
    );
  }
  if (!thread) {
    return <EmptyState />;
  }

  const onSend = async () => {
    if (!replyText.trim()) return;
    setIsSending(true);
    try {
      await sendAdminSupportReply(threadId, { text: replyText });
      setReplyText("");
      await mutateThread();
      onMutated();
      toast.success("Reply sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const onStatusChange = async (status: AdminThreadStatus) => {
    setIsUpdatingStatus(true);
    try {
      await updateAdminSupportThreadStatus(threadId, status);
      await mutateThread();
      onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <SenderAvatar
            name={thread.fromName || thread.userName || thread.fromEmail}
            avatarUrl={thread.userAvatarUrl}
            linked={Boolean(thread.userId)}
            className="h-10 w-10 shrink-0"
          />
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{thread.subject}</h2>
            <p className="text-sm text-muted-foreground truncate">
              <span className="font-mono">{thread.fromEmail}</span>
              {thread.userId && thread.organizationId && (
                <>
                  {" · "}
                  <Link
                    to={`/admin/organizations/${thread.organizationId}`}
                    className="hover:underline"
                  >
                    {thread.organizationName ?? thread.userName}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <Select
          value={thread.status}
          disabled={isUpdatingStatus}
          onValueChange={(v) => onStatusChange(v as AdminThreadStatus)}
        >
          <SelectTrigger className="w-32 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {messages.map((m) => (
          <MessageCard key={m.id} message={m} />
        ))}
      </div>

      <div className="border-t px-5 py-4 space-y-2">
        <Textarea
          placeholder="Write a reply…"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Reply goes to <span className="font-mono">{thread.fromEmail}</span>
          </span>
          <Button
            onClick={onSend}
            disabled={isSending || !replyText.trim()}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageCard({ message }: { message: AdminThreadMessage }) {
  const isInbound = message.direction === AdminMessageDirection.INBOUND;
  const [body, setBody] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);

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
    fetchAdminSupportMessageBody(message.id, preferredPart)
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
  }, [message.id, preferredPart]);

  const { visible, quoted } =
    body && preferredPart === "text"
      ? splitQuotedText(body)
      : { visible: body ?? "", quoted: "" };
  const [showQuoted, setShowQuoted] = useState(false);

  return (
    <div className={cn("pl-4", !isInbound && "border-l-2 border-l-primary")}>
      <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
        <span className="font-medium text-sm">
          {isInbound ? message.fromEmail : "You"}
        </span>
        <span className="text-muted-foreground shrink-0">
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
          // Inbound HTML can be untrusted; render in a sandboxed iframe so it
          // cannot execute scripts or escape into the admin app.
          <HtmlBodyFrame html={body} />
        )}
      </div>

      {message.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {message.attachments.map((a) => (
            <a
              key={a.id}
              href={adminSupportAttachmentUrl(a.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs border rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <Paperclip className="h-3 w-3" />
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
  return (
    <iframe
      title="Email HTML body"
      sandbox=""
      srcDoc={html}
      className="w-full min-h-[200px] border-0"
    />
  );
}

function ComposeThreadDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (thread: AdminThreadSummary) => void;
}) {
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setToEmail("");
      setSubject("");
      setText("");
      setIsSending(false);
    }
  }, [open]);

  const canSubmit =
    toEmail.trim().length > 0 &&
    subject.trim().length > 0 &&
    text.trim().length > 0 &&
    !isSending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSending(true);
    try {
      const { thread } = await createAdminSupportThread({
        toEmail: toEmail.trim(),
        subject: subject.trim(),
        text,
      });
      toast.success("Thread created");
      onCreated(thread);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create thread");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New thread</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="compose-to">To</Label>
            <UserSearchInput
              id="compose-to"
              value={toEmail}
              onChange={setToEmail}
              placeholder="customer@example.com or pick a registered user"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compose-subject">Subject</Label>
            <Input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compose-body">Message</Label>
            <Textarea
              id="compose-body"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              required
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <Send className="h-4 w-4 mr-2" />
              {isSending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserSearchInput({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  required,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value.trim()), 200);
    return () => clearTimeout(id);
  }, [value]);

  // Skip the fetch when the input is too short or already matches an email
  // we picked from the dropdown — saves a request per keystroke after select.
  const shouldQuery = debounced.length >= 2;
  const { users } = useAdminUsers(1, 8, shouldQuery ? debounced : undefined);
  const matches = shouldQuery
    ? users.filter(
        (u) => u.email && u.email.toLowerCase() !== value.toLowerCase().trim()
      )
    : [];

  useEffect(() => setHighlight(0), [debounced]);
  useEffect(() => {
    if (matches.length === 0) setOpen(false);
  }, [matches.length]);

  const pick = (user: AdminUser) => {
    if (!user.email) return;
    onChange(user.email);
    setOpen(false);
  };

  return (
    <Popover open={open && matches.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          id={id}
          type="email"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (matches.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => (h + 1) % matches.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => (h - 1 + matches.length) % matches.length);
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              pick(matches[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="p-1 w-[--radix-popover-trigger-width]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="max-h-64 overflow-y-auto">
          {matches.map((u, i) => (
            <li key={u.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(u)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm",
                  i === highlight && "bg-neutral-100 dark:bg-neutral-800"
                )}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={u.avatarUrl || undefined} />
                  <AvatarFallback>
                    {u.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function SenderAvatar({
  name,
  avatarUrl,
  linked,
  className,
}: {
  name: string;
  avatarUrl: string | null;
  linked: boolean;
  className?: string;
}) {
  const initial = name?.trim().charAt(0).toUpperCase() || "?";
  return (
    <Avatar
      className={cn(
        className,
        !linked && "opacity-60 ring-1 ring-dashed ring-neutral-300"
      )}
      title={linked ? undefined : "Unlinked sender (no matching user)"}
    >
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
      <Inbox className="h-8 w-8" />
      <p className="text-sm">Select a thread to view messages</p>
    </div>
  );
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
 * collapse the latter behind a "Show trimmed content" toggle. Falls back to
 * locating the first run of two or more consecutive lines beginning with `>`
 * for messages that omit an attribution line.
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
