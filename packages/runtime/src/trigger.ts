import type {
  DiscordInteraction,
  QueueMessage,
  ScheduledTrigger,
  SlackMessage,
  TelegramMessage,
  WhatsAppMessage,
} from "@dafthunk/types";

import type { BlobParameter } from "./node-types";

export interface HttpRequest {
  url?: string;
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  queryParams?: Record<string, string>; // Alias for query
  body?: BlobParameter; // Raw request body with MIME type
}

/**
 * A submitted form record that started a workflow (form_request /
 * form_webhook triggers). `record` is keyed by schema field name; blob fields
 * hold an ObjectReference. Validated against the trigger node's schema before
 * the workflow runs.
 */
export interface FormSubmission {
  record: Record<string, unknown>;
  timestamp: number;
}

export interface EmailMessage {
  from: string;
  to: string;
  headers: Record<string, string>;
  raw: string;
  /**
   * Mailbox context, present when the email was delivered to a persisted
   * per-org address. Lets downstream nodes thread replies and read history.
   */
  threadId?: string;
  messageId?: string;
  emailId?: string;
}

/**
 * Whatever caused a workflow run, plus the credentials needed to reply to it.
 *
 * Every layer that carries trigger data — the run parameters, the execution
 * context, the context handed to each node — composes this one interface rather
 * than restating its fields. Adding a trigger means editing this file and the
 * node that reads it, and nothing in between.
 *
 * Fields are all optional and independent: a run has at most one trigger, but
 * that invariant is established by the caller, not the type. Bot tokens sit
 * beside the message they authenticate because a node handling, say, an
 * incoming Telegram message almost always needs both to reply.
 */
export interface TriggerContext {
  /** Incoming HTTP request (for webhook-triggered workflows) */
  httpRequest?: HttpRequest;
  /** Submitted form record (for form_request/form_webhook workflows) */
  formSubmission?: FormSubmission;
  /** Incoming email message (for email-triggered workflows) */
  emailMessage?: EmailMessage;
  /** Incoming queue message (for queue-triggered workflows) */
  queueMessage?: QueueMessage;
  /** Incoming scheduled trigger (for cron-triggered workflows) */
  scheduledTrigger?: ScheduledTrigger;
  /** Incoming Discord interaction (for discord-triggered workflows) */
  discordInteraction?: DiscordInteraction;
  discordBotToken?: string;
  /** Incoming Telegram message (for telegram-triggered workflows) */
  telegramMessage?: TelegramMessage;
  telegramBotToken?: string;
  /** Incoming WhatsApp message (for whatsapp-triggered workflows) */
  whatsappMessage?: WhatsAppMessage;
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  /** Incoming Slack message (for slack-triggered workflows) */
  slackMessage?: SlackMessage;
  slackBotToken?: string;
}

/**
 * Picks just the trigger fields out of a wider object (typically RuntimeParams,
 * which also carries billing and identity data that nodes must not see).
 *
 * This is the single place the field list is enumerated at runtime; the type
 * above is the single place it is enumerated statically.
 */
export function extractTrigger(source: TriggerContext): TriggerContext {
  return {
    httpRequest: source.httpRequest,
    formSubmission: source.formSubmission,
    emailMessage: source.emailMessage,
    queueMessage: source.queueMessage,
    scheduledTrigger: source.scheduledTrigger,
    discordInteraction: source.discordInteraction,
    discordBotToken: source.discordBotToken,
    telegramMessage: source.telegramMessage,
    telegramBotToken: source.telegramBotToken,
    whatsappMessage: source.whatsappMessage,
    whatsappAccessToken: source.whatsappAccessToken,
    whatsappPhoneNumberId: source.whatsappPhoneNumberId,
    slackMessage: source.slackMessage,
    slackBotToken: source.slackBotToken,
  };
}
