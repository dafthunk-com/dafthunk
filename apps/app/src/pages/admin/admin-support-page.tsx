import Inbox from "lucide-react/icons/inbox";
import Paperclip from "lucide-react/icons/paperclip";
import Send from "lucide-react/icons/send";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { InsetError } from "@/components/inset-error";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useBreadcrumbsSetter } from "@/components/page-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  adminSupportAttachmentUrl,
  fetchAdminSupportMessageBody,
  sendAdminSupportReply,
  updateAdminSupportThreadStatus,
  useAdminSupportThread,
  useAdminSupportThreads,
  useAdminSupportUnreadCount,
} from "@/services/admin-service";
import { formatDate } from "@/utils/date";
import { cn } from "@/utils/utils";

const STATUS_FILTERS: { value: AdminThreadStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
];

const STATUS_BADGE: Record<
  AdminThreadStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  closed: {
    label: "Closed",
    className: "bg-neutral-200 text-neutral-700 hover:bg-neutral-200",
  },
};

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

  useEffect(() => {
    if (threads.length === 0) return;
    const stillVisible = threads.some((t) => t.id === selectedThreadId);
    if (!stillVisible) setSelectedThreadId(threads[0].id);
  }, [threads, selectedThreadId]);

  if (threadsError) {
    return <InsetError title="Support" errorMessage={threadsError.message} />;
  }

  return (
    <InsetLayout title="Support">
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center">
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

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        <ThreadList
          threads={threads}
          isLoading={isThreadsLoading}
          selectedThreadId={selectedThreadId}
          onSelect={setSelectedThreadId}
          pagination={pagination}
          page={page}
          onPageChange={setPage}
        />

        <div className="border rounded-md bg-white dark:bg-neutral-900 overflow-hidden">
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
    </InsetLayout>
  );
}

function ThreadList({
  threads,
  isLoading,
  selectedThreadId,
  onSelect,
  pagination,
  page,
  onPageChange,
}: {
  threads: AdminThreadSummary[];
  isLoading: boolean;
  selectedThreadId: string | null;
  onSelect: (id: string) => void;
  pagination: { total: number; totalPages: number } | null;
  page: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="border rounded-md bg-white dark:bg-neutral-900 flex flex-col overflow-hidden">
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
                    "w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors",
                    isSelected && "bg-neutral-100 dark:bg-neutral-800"
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
                      <div className="flex items-center justify-between gap-2 mb-1">
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
                          "text-sm truncate mb-1",
                          t.unread
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {t.subject || "(no subject)"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            STATUS_BADGE[t.status].className
                          )}
                        >
                          {STATUS_BADGE[t.status].label}
                        </Badge>
                        {t.userId && t.organizationId && (
                          <span className="text-xs text-muted-foreground truncate">
                            {t.organizationName ?? t.userName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="border-t px-3 py-2 flex items-center justify-between text-xs">
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

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m) => (
          <MessageCard key={m.id} message={m} />
        ))}
      </div>

      <div className="border-t p-3 space-y-2 bg-neutral-50 dark:bg-neutral-900/40">
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

  return (
    <div
      className={cn(
        "border rounded-md",
        isInbound
          ? "bg-white dark:bg-neutral-900"
          : "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
      )}
    >
      <div className="px-4 py-2 border-b flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0">
          <span className="font-medium">
            {isInbound ? message.fromEmail : "You"}
          </span>
          <span className="text-muted-foreground">
            {" "}
            → {isInbound ? "support" : message.toEmail}
          </span>
        </div>
        <span className="text-muted-foreground shrink-0">
          {formatDate(message.createdAt)}
        </span>
      </div>

      <div className="px-4 py-3 text-sm">
        {bodyError && (
          <p className="text-red-600 text-xs">
            Failed to load body: {bodyError}
          </p>
        )}
        {!bodyError && !preferredPart && (
          <p className="text-muted-foreground italic">(no body)</p>
        )}
        {!bodyError && preferredPart === "text" && (
          <pre className="whitespace-pre-wrap font-sans">
            {body ?? "Loading…"}
          </pre>
        )}
        {!bodyError && preferredPart === "html" && (
          // Inbound HTML can be untrusted; render in a sandboxed iframe so it
          // cannot execute scripts or escape into the admin app.
          <HtmlBodyFrame html={body} />
        )}
      </div>

      {message.attachments.length > 0 && (
        <div className="px-4 py-2 border-t flex flex-wrap gap-2">
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
