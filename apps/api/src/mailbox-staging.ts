/**
 * Shared inbound-email staging: parse a raw MIME message and persist its raw
 * bytes, bodies, and attachments to the `INBOXES` R2 bucket, returning the
 * structured metadata needed to index the message (in D1 for the support
 * inbox, or in the Mailbox Durable Object for per-org addresses).
 *
 * Keeping the parse + R2 layout here means the support and per-org paths agree
 * on exactly what gets stored and where, with the persistence backend being
 * the only difference between them.
 */

import PostalMime from "postal-mime";
import { v7 as uuidv7 } from "uuid";

import type { Bindings } from "./context";
import type { MailboxAttachmentInput } from "./durable-objects/mailbox-do";
import { inboxKeys } from "./support-storage";
import { buildSnippet, stripHtml } from "./support-utils";

export interface StagedEmail {
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  rfc822MessageId: string;
  inReplyTo: string | null;
  references: string[];
  referencesChain: string | null;
  snippet: string;
  hasHtml: boolean;
  hasText: boolean;
  rawR2Key: string;
  attachments: MailboxAttachmentInput[];
}

function parseReferences(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toUint8Array(content: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return new TextEncoder().encode(content);
}

/**
 * Parse `rawBytes` and write all blobs to R2 under `keyPrefix` (the inbox id
 * for support, the email id for per-org mailboxes). The raw MIME is written
 * first so the message survives even if parsing fails. Falls back to envelope
 * `from`/`to` when the parsed headers are missing.
 */
export async function parseAndStageEmail(
  env: Bindings,
  rawBytes: Uint8Array,
  keyPrefix: string,
  messageId: string,
  envelope: { from: string; to: string }
): Promise<StagedEmail> {
  const keys = inboxKeys(keyPrefix, messageId);

  await env.INBOXES.put(keys.raw, rawBytes, {
    httpMetadata: { contentType: "message/rfc822" },
  });

  const parsed = await new PostalMime().parse(rawBytes);

  const fromEmail = parsed.from?.address ?? envelope.from;
  const fromName = parsed.from?.name || null;
  const toEmail = parsed.to?.[0]?.address ?? envelope.to;
  const subject = parsed.subject?.trim() || "(no subject)";
  const rfc822MessageId =
    parsed.messageId?.trim() || `<${messageId}@inbox.local>`;
  const inReplyTo = parsed.inReplyTo?.trim() || null;
  const references = parseReferences(parsed.references);
  const referencesChain = references.length > 0 ? references.join(" ") : null;
  const textBody = parsed.text ?? undefined;
  const htmlBody = parsed.html ?? undefined;
  const snippet = buildSnippet(textBody ?? stripHtml(htmlBody));

  const parsedAttachments = parsed.attachments ?? [];
  const attachments: MailboxAttachmentInput[] = parsedAttachments.map(
    (att, i) => {
      const filename = att.filename || `attachment-${i + 1}`;
      return {
        id: uuidv7(),
        filename,
        contentType: att.mimeType || "application/octet-stream",
        sizeBytes: toUint8Array(att.content).byteLength,
        r2Key: keys.attachment(i, filename),
        contentId: att.contentId ?? null,
      };
    }
  );

  // Bodies + attachments are independent puts; run them concurrently. Raw MIME
  // (above) is the only ordering constraint.
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
      env.INBOXES.put(attachments[i].r2Key, toUint8Array(att.content), {
        httpMetadata: {
          contentType: att.mimeType || "application/octet-stream",
        },
      })
    );
  });
  await Promise.all(r2Puts);

  return {
    fromEmail,
    fromName,
    toEmail,
    subject,
    rfc822MessageId,
    inReplyTo,
    references,
    referencesChain,
    snippet,
    hasHtml: Boolean(htmlBody),
    hasText: Boolean(textBody),
    rawR2Key: keys.raw,
    attachments,
  };
}
