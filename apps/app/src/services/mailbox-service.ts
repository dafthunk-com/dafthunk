import type {
  GetMailboxThreadResponse,
  ListMailboxThreadsResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";
import { getApiBaseUrl } from "@/config/api";

import { makeOrgRequest } from "./utils";

// Read-only browsing of the conversations recorded for an email address. The
// underlying messages are written exclusively by workflow nodes, so this
// service exposes no mutations.
const API_ENDPOINT_BASE = "/emails";

/**
 * Hook to list the conversations recorded for an email address.
 */
export const useMailboxThreads = (emailId: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey =
    orgId && emailId
      ? `/${orgId}${API_ENDPOINT_BASE}/${emailId}/threads`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && emailId
      ? async () => {
          const response = await makeOrgRequest<ListMailboxThreadsResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${emailId}/threads`
          );
          return response.threads;
        }
      : null
  );

  return {
    threads: data || [],
    threadsError: error || null,
    isThreadsLoading: isLoading,
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
