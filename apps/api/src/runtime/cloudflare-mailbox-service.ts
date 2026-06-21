/**
 * Cloudflare-backed MailboxService.
 *
 * Routes thread/message storage through the per-organization Mailbox Durable
 * Object and sends outbound mail via the Cloudflare Email Service. Sending
 * follows the support inbox's pre-insert → send → rollback pattern so the DB
 * record never gets out of sync with the wire, and threads outbound replies so
 * the recipient's answer returns to the same conversation.
 */

import type {
  MailboxService,
  MailboxThread,
  MailboxThreadMessage,
  SendThreadedArgs,
  SendThreadedResult,
} from "@dafthunk/runtime";
import { v7 as uuidv7 } from "uuid";

import type { Bindings } from "../context";
import { createDatabase, getEmail } from "../db";
import { createEmailService } from "../services/email-service";
import { buildReplyAddress } from "../support-reply-token";
import { inboxKeys } from "../support-storage";
import { buildSnippet, stripHtml } from "../support-utils";

export class CloudflareMailboxService implements MailboxService {
  constructor(private env: Bindings) {}

  private stub(organizationId: string) {
    return this.env.MAILBOX.get(
      this.env.MAILBOX.idFromName(`mailbox:${organizationId}`)
    );
  }

  async sendThreaded(args: SendThreadedArgs): Promise<SendThreadedResult> {
    const db = createDatabase(this.env.DB);
    const email = await getEmail(db, args.emailId, args.organizationId);
    if (!email) {
      throw new Error("Email address not found or not owned by organization");
    }

    const emailService = createEmailService(this.env);
    if (!emailService) {
      throw new Error("Email service not configured");
    }

    const domain = this.env.EMAIL_DOMAIN;
    const from = `${email.handle}@${domain}`;
    const stub = this.stub(args.organizationId);

    // Resolve the thread up-front: attach to the given thread, or open a new
    // one keyed by the recipient so future replies thread by subject too.
    const threadId =
      args.threadId ??
      (
        await stub.createOutboundThread({
          emailId: args.emailId,
          subject: args.subject,
          fromEmail: args.to,
        })
      ).threadId;

    const messageId = uuidv7();
    const rfc822MessageId = `<${messageId}@${domain}>`;
    const references = args.references ?? [];
    const referencesChain = buildReferencesChain(
      references,
      args.inReplyTo ?? null
    );
    const keys = inboxKeys(args.emailId, messageId);

    // Pre-insert so a send-then-DB-failure can't leave the recipient with a
    // message we have no record of.
    await stub.insertOutbound({
      emailId: args.emailId,
      threadId,
      messageId,
      fromEmail: from,
      toEmail: args.to,
      subject: args.subject,
      rfc822MessageId,
      inReplyTo: args.inReplyTo ?? null,
      referencesChain,
      snippet: buildSnippet(args.text ?? stripHtml(args.html)),
      hasHtml: Boolean(args.html),
      hasText: Boolean(args.text),
      rawR2Key: keys.raw,
    });

    const replyTo = this.env.JWT_SECRET
      ? await buildReplyAddress(
          threadId,
          email.handle,
          domain,
          this.env.JWT_SECRET
        )
      : undefined;

    const sendResult = await emailService.sendThreaded({
      from,
      to: args.to,
      subject: args.subject,
      ...(args.html ? { html: args.html } : {}),
      ...(args.text ? { text: args.text } : {}),
      ...(args.inReplyTo ? { inReplyTo: args.inReplyTo } : {}),
      ...(references.length > 0 ? { references } : {}),
      messageId: rfc822MessageId,
      ...(replyTo ? { replyTo } : {}),
    });

    if (!sendResult.success) {
      await stub.deleteMessage(messageId).catch((error) => {
        console.error("[mailbox send] rollback failed", error);
      });
      throw new Error(sendResult.error ?? "Failed to send email");
    }

    // Archive the on-wire MIME + bodies. Awaited inline because the workflow
    // runtime has no ExecutionContext.waitUntil here; failures are non-fatal.
    const r2Puts: Promise<unknown>[] = [];
    if (sendResult.rawMime) {
      r2Puts.push(
        this.env.INBOXES.put(keys.raw, sendResult.rawMime, {
          httpMetadata: { contentType: "message/rfc822" },
        })
      );
    }
    if (args.text) {
      r2Puts.push(
        this.env.INBOXES.put(
          keys.textBody,
          new TextEncoder().encode(args.text),
          {
            httpMetadata: { contentType: "text/plain; charset=utf-8" },
          }
        )
      );
    }
    if (args.html) {
      r2Puts.push(
        this.env.INBOXES.put(
          keys.htmlBody,
          new TextEncoder().encode(args.html),
          {
            httpMetadata: { contentType: "text/html; charset=utf-8" },
          }
        )
      );
    }
    const results = await Promise.allSettled(r2Puts);
    results.forEach((r) => {
      if (r.status === "rejected") {
        console.error("[mailbox send] R2 archive failed", r.reason);
      }
    });

    await stub.touchThread(threadId).catch((error) => {
      console.error("[mailbox send] touchThread failed", error);
    });

    return { messageId, threadId };
  }

  async getThread(
    threadId: string,
    organizationId: string
  ): Promise<MailboxThread | undefined> {
    const row = await this.stub(organizationId).getThread(threadId);
    return row ?? undefined;
  }

  async listThreadMessages(
    threadId: string,
    organizationId: string
  ): Promise<MailboxThreadMessage[]> {
    return this.stub(organizationId).listThreadMessages(threadId);
  }
}

function buildReferencesChain(
  existing: string[],
  inReplyTo: string | null
): string | null {
  if (existing.length === 0 && !inReplyTo) return null;
  const chain = inReplyTo ? [...existing, inReplyTo] : existing;
  return Array.from(new Set(chain)).join(" ");
}
