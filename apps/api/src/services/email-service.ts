import { v7 as uuidv7 } from "uuid";

import type { Bindings } from "../context";

export interface EmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ThreadedEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  inReplyTo?: string;
  references?: string[];
  /**
   * Optional pre-generated RFC 5322 Message-ID. When set, the service uses
   * it verbatim instead of minting a new one. Lets the caller persist a row
   * with the final Message-ID *before* the send is attempted, which keeps
   * the DB record in sync with the wire.
   */
  messageId?: string;
}

export interface ThreadedEmailResult {
  success: boolean;
  /** RFC 5322 Message-ID we generated for this send. Stable across the trip. */
  rfc822MessageId?: string;
  error?: string;
}

/**
 * Application-level email service for sending transactional emails
 * via the Cloudflare Email Service binding.
 */
export class EmailService {
  private binding: SendEmail;
  private fromAddress: string;

  constructor(env: Bindings) {
    if (!env.SEND_EMAIL) {
      throw new Error("SEND_EMAIL binding is not configured");
    }
    if (!env.SEND_EMAIL_FROM) {
      throw new Error("SEND_EMAIL_FROM is not configured");
    }
    this.binding = env.SEND_EMAIL;
    this.fromAddress = env.SEND_EMAIL_FROM;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const { from, to, subject, html, text, replyTo } = options;

    if (!to || !subject) {
      return { success: false, error: "'to' and 'subject' are required" };
    }

    if (!html && !text) {
      return {
        success: false,
        error: "At least one of 'html' or 'text' body must be provided",
      };
    }

    try {
      const result = await this.binding.send({
        from: from ?? this.fromAddress,
        to,
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        ...(replyTo ? { replyTo } : {}),
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Email Service error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send an email that participates in a conversation thread. Generates a
   * stable RFC 5322 Message-ID and sets In-Reply-To / References so the
   * recipient's mail client groups replies with the original.
   *
   * The Cloudflare SendEmail builder accepts arbitrary `headers`, so we do
   * not need to hand-build raw MIME for this.
   */
  async sendThreaded(
    options: ThreadedEmailOptions
  ): Promise<ThreadedEmailResult> {
    const {
      from,
      to,
      subject,
      html,
      text,
      inReplyTo,
      references,
      messageId,
    } = options;

    if (!to || !subject) {
      return { success: false, error: "'to' and 'subject' are required" };
    }
    if (!html && !text) {
      return {
        success: false,
        error: "At least one of 'html' or 'text' body must be provided",
      };
    }

    const domain = from.includes("@") ? from.split("@")[1] : "mail.local";
    const rfc822MessageId = messageId ?? `<${uuidv7()}@${domain}>`;

    const headers: Record<string, string> = { "Message-ID": rfc822MessageId };
    if (inReplyTo) headers["In-Reply-To"] = inReplyTo;
    const chain = [...(references ?? []), ...(inReplyTo ? [inReplyTo] : [])];
    if (chain.length > 0) {
      headers["References"] = Array.from(new Set(chain)).join(" ");
    }

    try {
      await this.binding.send({
        from,
        to,
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        headers,
      });
      return { success: true, rfc822MessageId };
    } catch (error) {
      console.error("Email Service sendThreaded error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create an email service instance from environment bindings.
 * Returns null if email is not configured (allows graceful degradation).
 */
export function createEmailService(env: Bindings): EmailService | null {
  try {
    return new EmailService(env);
  } catch (error) {
    console.warn("Email service not available:", error);
    return null;
  }
}
