/**
 * Abstract mailbox access for workflow nodes.
 *
 * Per-organization email addresses behave like a real mailbox: inbound and
 * outbound mail is persisted and threaded so a workflow can send and receive
 * with the same address and read prior thread history. Nodes never touch the
 * underlying storage (a Durable Object in production) directly — they receive
 * this service on their context, scoped by `organizationId`.
 */

export interface MailboxThreadMessage {
  id: string;
  direction: "inbound" | "outbound";
  fromEmail: string;
  toEmail: string;
  subject: string;
  snippet: string;
  rfc822MessageId: string;
  inReplyTo: string | null;
  referencesChain: string | null;
  hasHtml: boolean;
  hasText: boolean;
  attachmentCount: number;
  /** Creation time as epoch milliseconds. */
  createdAt: number;
}

export interface MailboxThread {
  id: string;
  emailId: string;
  subject: string;
  fromEmail: string;
  /** Last activity time as epoch milliseconds. */
  lastMessageAt: number;
  /** Creation time as epoch milliseconds. */
  createdAt: number;
}

export interface SendThreadedArgs {
  /** Organization owning the mailbox (selects the backing store). */
  organizationId: string;
  /** The org email address sending the message (verifies ownership, sets From). */
  emailId: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  /** Existing thread to attach this message to (omit to start a new thread). */
  threadId?: string;
  /** RFC 5322 Message-ID this message replies to. */
  inReplyTo?: string | null;
  /** RFC 5322 References chain to carry forward. */
  references?: string[];
}

export interface SendThreadedResult {
  messageId: string;
  /** Thread the message was sent on — newly opened when no `threadId` was given. */
  threadId: string;
}

export interface MailboxService {
  /**
   * Send an outbound message from an org address, persisting it and threading
   * it against the conversation so the recipient's reply returns to the same
   * thread. Throws if the email is not found / not owned by the organization
   * or the send fails.
   */
  sendThreaded(args: SendThreadedArgs): Promise<SendThreadedResult>;

  /** Fetch a thread's summary, or undefined when it doesn't exist. */
  getThread(
    threadId: string,
    organizationId: string
  ): Promise<MailboxThread | undefined>;

  /** List a thread's messages in chronological order. */
  listThreadMessages(
    threadId: string,
    organizationId: string
  ): Promise<MailboxThreadMessage[]>;
}
