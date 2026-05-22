import { EmailMessage } from "cloudflare:email";
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
  /**
   * Optional Reply-To address. Used by the support inbox to advertise a
   * per-thread tokenized address so the recipient's reply can be attached
   * to the right thread without trusting the From: header.
   */
  replyTo?: string;
}

export interface ThreadedEmailResult {
  success: boolean;
  /** RFC 5322 Message-ID we generated for this send. Stable across the trip. */
  rfc822MessageId?: string;
  /**
   * The exact RFC 5322 bytes handed to the SMTP layer. Returned on success so
   * callers can persist the same bytes to long-term storage and guarantee that
   * the on-wire and archived MIME match.
   */
  rawMime?: string;
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
   * The Cloudflare SendEmail builder rejects `Message-ID` (and other non-
   * whitelisted headers), so threaded sends go through the raw-MIME path:
   * we hand-build the RFC 5322 message and submit it as an `EmailMessage`.
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
      replyTo,
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
    if (Array.isArray(to)) {
      // `EmailMessage` takes a single envelope recipient; threaded replies are
      // always 1:1 in our use, so reject the multi-to shape rather than
      // silently picking one.
      return {
        success: false,
        error: "sendThreaded requires a single recipient",
      };
    }

    const domain = from.includes("@") ? from.split("@")[1] : "mail.local";
    const rfc822MessageId = messageId ?? `<${uuidv7()}@${domain}>`;

    const rawMime = buildThreadedMime({
      from,
      to,
      subject,
      messageId: rfc822MessageId,
      inReplyTo: inReplyTo ?? null,
      references: references ?? [],
      text,
      html,
      date: new Date(),
      replyTo: replyTo ?? null,
    });

    try {
      const message = new EmailMessage(from, to, rawMime);
      await this.binding.send(message);
      return { success: true, rfc822MessageId, rawMime };
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
 * Compose an RFC 5322 message with threading headers. Exposed so callers
 * (e.g. archival paths) can build the same bytes that `sendThreaded` puts on
 * the wire without depending on the send result.
 */
export function buildThreadedMime(args: {
  from: string;
  to: string;
  subject: string;
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  text?: string;
  html?: string;
  date: Date;
  replyTo?: string | null;
}): string {
  const boundary = `dafthunk-${uuidv7()}`;
  const headers: string[] = [
    `From: ${args.from}`,
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    `Date: ${args.date.toUTCString()}`,
    `Message-ID: ${args.messageId}`,
  ];
  if (args.replyTo) headers.push(`Reply-To: ${args.replyTo}`);
  if (args.inReplyTo) headers.push(`In-Reply-To: ${args.inReplyTo}`);
  // RFC 5322 §3.6.4: References should chain the parent message's id alongside
  // any prior References. Dedupe in case the caller already included it.
  const fullReferences = Array.from(
    new Set([...args.references, ...(args.inReplyTo ? [args.inReplyTo] : [])])
  );
  if (fullReferences.length > 0) {
    headers.push(`References: ${fullReferences.join(" ")}`);
  }
  headers.push("MIME-Version: 1.0");

  let body: string;
  if (args.text && args.html) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body = [
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      args.text,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      args.html,
      `--${boundary}--`,
      ``,
    ].join("\r\n");
  } else if (args.html) {
    headers.push("Content-Type: text/html; charset=utf-8");
    body = `\r\n${args.html}`;
  } else {
    headers.push("Content-Type: text/plain; charset=utf-8");
    body = `\r\n${args.text ?? ""}`;
  }

  return headers.join("\r\n") + "\r\n" + body;
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
