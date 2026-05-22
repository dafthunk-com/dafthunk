/**
 * Shared layout for the support-email R2 bucket (`INBOXES`).
 *
 * Every callsite that reads or writes a blob for a thread builds its key
 * through this helper so the layout is defined exactly once. Changing the
 * layout (e.g. introducing a version segment) becomes a single-file edit
 * instead of a scavenger hunt across `support-email.ts`, `support-send.ts`,
 * and the admin route handlers.
 */

/** Sanitise an attachment filename for safe inclusion in an R2 key. */
function safeAttachmentName(filename: string): string {
  return filename.replace(/[^\w.-]+/g, "_");
}

export function inboxKeys(inboxId: string, messageId: string) {
  const base = `${inboxId}/${messageId}`;
  return {
    raw: `${base}/raw.eml`,
    textBody: `${base}/body.txt`,
    htmlBody: `${base}/body.html`,
    attachment: (index: number, filename: string) =>
      `${base}/attachments/${index}-${safeAttachmentName(filename)}`,
  };
}

/** Alias of the default inbox; the row is seeded by migration 0059. */
export const SUPPORT_INBOX_ALIAS = "support";
