import type {
  GetMailboxThreadResponse,
  ListMailboxThreadsResponse,
  MailboxThreadSummary,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";
import { getApiBaseUrl } from "@/config/api";
import { useInfinatePagination } from "@/hooks/use-infinate-pagination";

import { makeOrgRequest } from "./utils";

// Read-only browsing of the conversations recorded for an email address. The
// underlying messages are written exclusively by workflow nodes, so this
// service exposes no mutations.
const API_ENDPOINT_BASE = "/emails";
const THREADS_PAGE_SIZE = 50;

/**
 * Hook to list the conversations recorded for an email address, with infinite
 * scroll. Pages are fetched lazily as the observer target scrolls into view,
 * so there is no upper bound on how many conversations can be browsed.
 */
export const useMailboxThreads = (emailId: string | null, search?: string) => {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const trimmedSearch = search?.trim();

  const getKey = (
    pageIndex: number,
    previousPageData: MailboxThreadSummary[] | null
  ) => {
    if (previousPageData && previousPageData.length < THREADS_PAGE_SIZE) {
      return null; // Reached the end.
    }
    if (!orgId || !emailId) return null;
    const query = new URLSearchParams({
      offset: String(pageIndex * THREADS_PAGE_SIZE),
      limit: String(THREADS_PAGE_SIZE),
    });
    // Folding the term into the key restarts pagination when the search
    // changes, so results never mix terms across pages.
    if (trimmedSearch) query.set("search", trimmedSearch);
    return `/${orgId}${API_ENDPOINT_BASE}/${emailId}/threads?${query}`;
  };

  const fetcher = async (url: string): Promise<MailboxThreadSummary[]> => {
    if (!orgId || !emailId) return [];
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname.replace(`/${orgId}`, "");
    const response = await makeOrgRequest<ListMailboxThreadsResponse>(
      orgId,
      path,
      urlObj.search
    );
    return response.threads;
  };

  const {
    paginatedData,
    error,
    isInitialLoading,
    isLoadingMore,
    isReachingEnd,
    observerTargetRef,
    mutate,
  } = useInfinatePagination<MailboxThreadSummary>(getKey, fetcher, {
    pageSize: THREADS_PAGE_SIZE,
  });

  return {
    threads: paginatedData,
    threadsError: error || null,
    isThreadsLoading: isInitialLoading,
    isThreadsLoadingMore: isLoadingMore,
    isThreadsReachingEnd: isReachingEnd,
    threadsObserverTargetRef: observerTargetRef,
    mutateThreads: mutate,
  };
};

/**
 * Hook to load a single conversation with its messages and attachments.
 */
export const useMailboxThread = (
  emailId: string | null,
  threadId: string | null
) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey =
    orgId && emailId && threadId
      ? `/${orgId}${API_ENDPOINT_BASE}/${emailId}/threads/${threadId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && emailId && threadId
      ? async () =>
          makeOrgRequest<GetMailboxThreadResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${emailId}/threads/${threadId}`
          )
      : null
  );

  return {
    thread: data?.thread || null,
    messages: data?.messages || [],
    threadError: error || null,
    isThreadLoading: isLoading,
    mutateThread: mutate,
  };
};

/**
 * Fetch a message body part as text. Bodies stream from R2 behind a sandbox
 * disposition, so they are read directly rather than through the JSON helper.
 */
export const fetchMailboxMessageBody = async (
  orgId: string,
  emailId: string,
  messageId: string,
  part: "text" | "html"
): Promise<string> => {
  const url = `${getApiBaseUrl()}/${orgId}${API_ENDPOINT_BASE}/${emailId}/messages/${messageId}/body?part=${part}`;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to load message body (${response.status})`);
  }
  return response.text();
};

/**
 * Build the download URL for an attachment blob.
 */
export const mailboxAttachmentUrl = (
  orgId: string,
  emailId: string,
  attachmentId: string
): string =>
  `${getApiBaseUrl()}/${orgId}${API_ENDPOINT_BASE}/${emailId}/attachments/${attachmentId}`;
