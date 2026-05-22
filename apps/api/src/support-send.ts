import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import type { Bindings } from "./context";
import {
  type Database,
  insertMessage,
  MessageDirection,
  messages,
  threads,
} from "./db";
import { createEmailService } from "./services/email-service";
import { buildReplyToAddress } from "./support-reply-token";
import { buildSnippet, stripHtml } from "./support-utils";

/**
 * Send an outbound message on a support thread (reply or first message),
 * persist the DB row before send, archive the raw MIME and body parts to
 * R2 after send, and bump the thread's `lastMessageAt`.
 *
 * The pre-insert + post-send rollback pattern closes the gap where send
 * succeeds but the DB doesn't, which would leave the recipient with a
 * message we have no record of. The R2 puts and the lastMessageAt update
 * are best-effort and deferred via `executionCtx.waitUntil` so the admin
 * client returns immediately.
 */
export async function sendOutboundSupportMessage(
  db: Database,
  env: Bindings,
  executionCtx: ExecutionContext,
  args: {
    threadId: string;
    toAddress: string;
    subject: string;
    text?: string;
    html?: string;
    inReplyTo?: string | null;
    references?: string[];
    adminUserId: string | null;
  }
): Promise<
  | { ok: true; messageId: string }
  | { ok: false; status: 500 | 502; error: string }
> {
  const from = env.SUPPORT_EMAIL_FROM;
  if (!from) {
    return { ok: false, status: 500, error: "SUPPORT_EMAIL_FROM is not configured" };
  }

  const emailService = createEmailService(env);
  if (!emailService) {
    return { ok: false, status: 500, error: "Email service not configured" };
  }

  const messageRowId = uuidv7();
  const fromDomain = from.includes("@") ? from.split("@")[1] : "mail.local";
  const rfc822MessageId = `<${messageRowId}@${fromDomain}>`;
  const keyBase = `support/${messageRowId}`;
  const rawR2Key = `${keyBase}/raw.eml`;
  const references = args.references ?? [];
  const referencesChain = buildReferencesChain(references, args.inReplyTo ?? null);

  try {
    await insertMessage(db, {
      id: messageRowId,
      threadId: args.threadId,
      direction: MessageDirection.OUTBOUND,
      rfc822MessageId,
      inReplyTo: args.inReplyTo ?? null,
      referencesChain,
      fromEmail: from,
      toEmail: args.toAddress,
      subject: args.subject,
      snippet: buildSnippet(args.text ?? stripHtml(args.html)),
      hasHtml: Boolean(args.html),
      hasText: Boolean(args.text),
      attachmentCount: 0,
      rawR2Key,
      authorAdminUserId: args.adminUserId,
    });
  } catch (error) {
    console.error("[support send] pre-insert failed", error);
    return { ok: false, status: 500, error: "Failed to record outbound message" };
  }

  const replyTo = (await buildReplyToAddress(args.threadId, env)) ?? undefined;

  const sendResult = await emailService.sendThreaded({
    from,
    to: args.toAddress,
    subject: args.subject,
    ...(args.html ? { html: args.html } : {}),
    ...(args.text ? { text: args.text } : {}),
    ...(args.inReplyTo ? { inReplyTo: args.inReplyTo } : {}),
    ...(references.length > 0 ? { references } : {}),
    messageId: rfc822MessageId,
    ...(replyTo ? { replyTo } : {}),
  });

  if (!sendResult.success) {
    try {
      await db.delete(messages).where(eq(messages.id, messageRowId));
    } catch (cleanupError) {
      console.error("[support send] cleanup after send failure failed", cleanupError);
    }
    return {
      ok: false,
      status: 502,
      error: sendResult.error ?? "Failed to send email",
    };
  }

  const now = new Date();
  const outboundMime = sendResult.rawMime;
  const deferred: Promise<unknown>[] = [
    db
      .update(threads)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(threads.id, args.threadId)),
  ];
  if (outboundMime) {
    deferred.push(
      env.RESSOURCES.put(rawR2Key, outboundMime, {
        httpMetadata: { contentType: "message/rfc822" },
      })
    );
  }
  if (args.text) {
    deferred.push(
      env.RESSOURCES.put(
        `${keyBase}/body.txt`,
        new TextEncoder().encode(args.text),
        { httpMetadata: { contentType: "text/plain; charset=utf-8" } }
      )
    );
  }
  if (args.html) {
    deferred.push(
      env.RESSOURCES.put(
        `${keyBase}/body.html`,
        new TextEncoder().encode(args.html),
        { httpMetadata: { contentType: "text/html; charset=utf-8" } }
      )
    );
  }
  executionCtx.waitUntil(
    Promise.allSettled(deferred).then((results) => {
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[support send] deferred task ${i} failed`, r.reason);
        }
      });
    })
  );

  return { ok: true, messageId: messageRowId };
}

function buildReferencesChain(
  existing: string[],
  lastInboundId: string | null
): string | null {
  if (existing.length === 0 && !lastInboundId) return null;
  const chain = lastInboundId ? [...existing, lastInboundId] : existing;
  return Array.from(new Set(chain)).join(" ");
}
