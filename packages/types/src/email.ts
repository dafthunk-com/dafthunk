// Email Types
export interface CreateEmailRequest {
  name: string;
}

interface EmailResponseBase {
  id: string;
  name: string;
  handle: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEmailResponse = EmailResponseBase;

export type GetEmailResponse = EmailResponseBase;

export interface ListEmailsResponse {
  emails: EmailResponseBase[];
}

export interface UpdateEmailRequest {
  name: string;
}

export type UpdateEmailResponse = EmailResponseBase;

export interface DeleteEmailResponse {
  id: string;
}

// Email Trigger Types
export interface EmailTrigger {
  workflowId: string;
  emailId: string;
  active: boolean;
}

export interface GetEmailTriggerResponse {
  workflowId: string;
  emailId: string;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertEmailTriggerRequest {
  emailId: string;
  active?: boolean;
}

export type UpsertEmailTriggerResponse = GetEmailTriggerResponse;

export interface DeleteEmailTriggerResponse {
  workflowId: string;
}

// Mailbox Browsing Types
//
// Read-only view over the conversations recorded for an email address. The
// underlying messages are written exclusively by workflow nodes; this surface
// only lets a user navigate what has already been exchanged. Timestamps are
// epoch milliseconds, matching how the mailbox stores them.

export type MailboxMessageDirection = "inbound" | "outbound";

export interface MailboxThreadSummary {
  id: string;
  subject: string;
  fromEmail: string;
  lastMessageAt: number;
  createdAt: number;
}

export interface MailboxAttachmentSummary {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface MailboxMessageSummary {
  id: string;
  direction: MailboxMessageDirection;
  fromEmail: string;
  toEmail: string;
  subject: string;
  snippet: string;
  hasHtml: boolean;
  hasText: boolean;
  attachmentCount: number;
  createdAt: number;
  attachments: MailboxAttachmentSummary[];
}

export interface ListMailboxThreadsResponse {
  threads: MailboxThreadSummary[];
}

export interface GetMailboxThreadResponse {
  thread: MailboxThreadSummary;
  messages: MailboxMessageSummary[];
}
