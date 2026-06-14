import { eq } from "drizzle-orm";
import PostalMime from "postal-mime";
import { v7 as uuidv7 } from "uuid";

import type { Bindings } from "./context";
import {
  type AttachmentInsert,
  createDatabase,
  createThread,
  findUserByEmail,
  getInboxByAlias,
  insertAttachments,
  insertMessage,
  MessageDirection,
  resolveThreadForInbound,
  threads,
  touchThreadOnInbound,
} from "./db";
import { verifyReplyToken } from "./support-reply-token";
import { inboxKeys, SUPPORT_INBOX_ALIAS } from "./support-storage";
import { buildSnippet, stripHtml } from "./support-utils";

/**
 * Cheap spam gate: trust Cloudflare's Authentication-Results header. We
 * accept the message if either SPF or DKIM passed (mirroring how DMARC
 * evaluates alignment). If both verdicts are present and both failed —
 * almost always a spoof — we drop without persisting. If the header is
 * absent (local dev, unusual relays) we let the message through.
 */
export function isAuthenticated(headers: Headers): boolean {
  const auth = headers.get("Authentication-Results");
  if (!auth) return true;
  const lower = auth.toLowerCase();
  const spf = /\bspf=(\w+)/.exec(lower)?.[1];
  const dkim = /\bdkim=(\w+)/.exec(lower)?.[1];
  if (spf === "pass" || dkim === "pass") return true;
  // Only drop when we have a clear negative signal on both sides. "none" or
  // "neutral" on its own should not bounce legitimate-but-unauth'd mail.
  if (spf === "fail" && dkim === "fail") return false;
  return true;
}

async function streamToBytes(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function parseReferences(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Failure mode: this runs in the email-routing path, where throwing would
 * cause Cloudflare to bounce the message back to the sender. Catch + log so
 * a parse failure never nukes legitimate mail.
 *
 * `replySubaddress` is the RFC 5233 plus-tag from the inbound address. When
 * it verifies as a reply token we trust it alone and skip the subject/From
 * heuristics — see `support-reply-token.ts`.
 */
export async function handleSupportEmail(
  message: ForwardableEmailMessage,
  env: Bindings,
  _ctx: ExecutionContext,
  replySubaddress: string | null = null
): Promise<void> {
  if (!isAuthenticated(message.headers)) {
    console.warn(
      `[support-email] dropping unauthenticated message from ${message.from}`
    );
    return;
  }

  const db = createDatabase(env.DB);
  const messageRowId = uuidv7();

  // Today the support handler always targets the "support" inbox. When
  // multi-inbox routing arrives, the alias will come from the routing layer.
  // The lookup and the (potentially slow) stream read are independent — run
  // them in parallel so a cold-cache lookup doesn't add latency. Use
  // allSettled so we can distinguish which side failed when one rejects.
  const [inboxResult, rawResult] = await Promise.allSettled([
    getInboxByAlias(db, SUPPORT_INBOX_ALIAS),
    streamToBytes(message.raw),
  ]);
  if (inboxResult.status === "rejected") {
    console.error("[support-email] inbox lookup failed", inboxResult.reason);
    return;
  }
  if (rawResult.status === "rejected") {
    console.error(
      "[support-email] failed to read raw stream",
      rawResult.reason
    );
    return;
  }
  const inbox = inboxResult.value;
  const rawBytes = rawResult.value;

  if (!inbox) {
    console.error(
      "[support-email] support inbox row missing; refusing to ingest mail"
    );
    return;
  }

  const keys = inboxKeys(inbox.id, messageRowId);

  try {
    await env.INBOXES.put(keys.raw, rawBytes, {
      httpMetadata: { contentType: "message/rfc822" },
    });
  } catch (error) {
    console.error("[support-email] failed to persist raw MIME to R2", error);
    return;
  }

  let parsed: Awaited<ReturnType<PostalMime["parse"]>>;
  try {
    parsed = await new PostalMime().parse(rawBytes);
  } catch (error) {
    // Raw MIME is already in R2 so the message isn't lost — only the DB row
    // is. Log loudly so we notice.
    console.error("[support-email] postal-mime parse failed", error);
    return;
  }

  const fromAddress = parsed.from?.address ?? message.from;
  const fromName = parsed.from?.name || undefined;
  const toAddress = parsed.to?.[0]?.address ?? message.to;
  const subject = parsed.subject?.trim() || "(no subject)";
  const rfc822MessageId =
    parsed.messageId?.trim() || `<${messageRowId}@inbox.local>`;
  const inReplyTo = parsed.inReplyTo?.trim() || null;
  const references = parseReferences(parsed.references);
  const referencesChain = references.length > 0 ? references.join(" ") : null;
  const textBody = parsed.text ?? undefined;
  const htmlBody = parsed.html ?? undefined;
  const snippet = buildSnippet(textBody ?? stripHtml(htmlBody));

  const parsedAttachments = parsed.attachments ?? [];
  const attachmentInserts: AttachmentInsert[] = parsedAttachments.map(
    (att, i) => {
      const filename = att.filename || `attachment-${i + 1}`;
      return {
        id: uuidv7(),
        messageId: messageRowId,
        filename,
        contentType: att.mimeType || "application/octet-stream",
        sizeBytes: toUint8Array(att.content).byteLength,
        r2Key: keys.attachment(i, filename),
        contentId: att.contentId ?? null,
      };
    }
  );

  // Bodies + all attachments are independent puts; run them concurrently so
  // the email-routing handler returns quickly. Raw MIME is the only ordering
  // constraint (already written above so we have an archive on parse failure).
  const r2Puts: Promise<unknown>[] = [];
  if (textBody) {
    r2Puts.push(
      env.INBOXES.put(keys.textBody, new TextEncoder().encode(textBody), {
        httpMetadata: { contentType: "text/plain; charset=utf-8" },
      })
    );
  }
  if (htmlBody) {
    r2Puts.push(
      env.INBOXES.put(keys.htmlBody, new TextEncoder().encode(htmlBody), {
        httpMetadata: { contentType: "text/html; charset=utf-8" },
      })
    );
  }
  parsedAttachments.forEach((att, i) => {
    r2Puts.push(
      env.INBOXES.put(attachmentInserts[i].r2Key, toUint8Array(att.content), {
        httpMetadata: {
          contentType: att.mimeType || "application/octet-stream",
        },
      })
    );
  });
  await Promise.all(r2Puts);

  const now = new Date();
  let threadId: string;

  const verifiedThreadId =
    replySubaddress && env.JWT_SECRET
      ? await verifyReplyToken(replySubaddress, env.JWT_SECRET)
      : null;

  if (verifiedThreadId) {
    const [existing] = await db
      .select({ id: threads.id })
      .from(threads)
      .where(eq(threads.id, verifiedThreadId))
      .limit(1);
    if (!existing) {
      // Drop rather than silently creating a thread under a forged id —
      // when the token verifies, the From: is intentionally untrusted.
      console.warn(
        `[support-email] tokenized reply for missing thread ${verifiedThreadId} from ${fromAddress}; dropping`
      );
      return;
    }
    threadId = existing.id;
    await touchThreadOnInbound(db, threadId, now);
  } else {
    if (replySubaddress) {
      console.warn(
        `[support-email] unverified reply subaddress from ${fromAddress}; falling back to header/subject resolution`
      );
    }
    const existingThread = await resolveThreadForInbound(db, {
      inReplyTo,
      references,
      fromEmail: fromAddress,
      subject,
    });
    if (existingThread) {
      threadId = existingThread.id;
      await touchThreadOnInbound(db, threadId, now);
    } else {
      const linkedUser = await findUserByEmail(db, fromAddress);
      const thread = await createThread(db, {
        inboxId: inbox.id,
        subject,
        fromEmail: fromAddress,
        fromName: fromName ?? null,
        userId: linkedUser?.id ?? null,
        organizationId: linkedUser?.organizationId ?? null,
        lastMessageAt: now,
      });
      threadId = thread.id;
    }
  }

  await insertMessage(db, {
    id: messageRowId,
    threadId,
    direction: MessageDirection.INBOUND,
    rfc822MessageId,
    inReplyTo,
    referencesChain,
    fromEmail: fromAddress,
    toEmail: toAddress,
    subject,
    snippet,
    hasHtml: Boolean(htmlBody),
    hasText: Boolean(textBody),
    attachmentCount: attachmentInserts.length,
    rawR2Key: keys.raw,
    authorAdminUserId: null,
  });

  await insertAttachments(db, attachmentInserts);

  console.log(
    `[support-email] persisted message ${messageRowId} on thread ${threadId} from ${fromAddress}`
  );
}

function toUint8Array(content: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return new TextEncoder().encode(content);
}
