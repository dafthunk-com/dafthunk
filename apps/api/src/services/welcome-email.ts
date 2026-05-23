import { eq } from "drizzle-orm";

import type { Bindings } from "../context";
import { createThread, type Database, getInboxByAlias, threads } from "../db";
import { sendOutboundSupportMessage } from "../support-send";
import { SUPPORT_INBOX_ALIAS } from "../support-storage";
import { getWelcomeEmail } from "./email-templates";

export type WelcomeEmailResult =
  | { ok: true; threadId: string; messageId: string }
  | { ok: false; status: 400 | 500 | 502; error: string };

/**
 * Open a support thread addressed to the user and seed it with the welcome
 * email. Routing the welcome through the support inbox gives the recipient a
 * tokenized Reply-To, so any reply they send lands on the same thread in the
 * admin support view — turning the first email into an actual conversation.
 *
 * Returns a structured result so callers can decide between best-effort
 * (auth flow swallows the failure) and surfacing an HTTP error (admin resend).
 */
export async function sendWelcomeEmail(
  db: Database,
  env: Bindings,
  executionCtx: ExecutionContext,
  user: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
  }
): Promise<WelcomeEmailResult> {
  const inbox = await getInboxByAlias(db, SUPPORT_INBOX_ALIAS);
  if (!inbox) {
    return { ok: false, status: 500, error: "Support inbox not configured" };
  }

  const content = getWelcomeEmail({
    userName: user.name,
    appUrl: env.WEB_HOST,
    websiteUrl: env.WEBSITE_URL,
    discordUrl: env.DISCORD_URL,
    githubUrl: env.GITHUB_URL,
  });
  const recipient = user.email.toLowerCase();
  const thread = await createThread(db, {
    inboxId: inbox.id,
    subject: content.subject,
    fromEmail: recipient,
    fromName: user.name || null,
    userId: user.id,
    organizationId: user.organizationId,
    lastMessageAt: new Date(),
  });

  const sendResult = await sendOutboundSupportMessage(db, env, executionCtx, {
    threadId: thread.id,
    inboxId: inbox.id,
    toAddress: recipient,
    subject: content.subject,
    text: content.text,
    html: content.html,
    adminUserId: null,
  });

  if (!sendResult.ok) {
    // Roll back the orphaned empty thread, mirroring /admin/support/threads.
    try {
      await db.delete(threads).where(eq(threads.id, thread.id));
    } catch (cleanupError) {
      console.error("[welcome] thread cleanup failed", cleanupError);
    }
    return { ok: false, status: sendResult.status, error: sendResult.error };
  }

  return { ok: true, threadId: thread.id, messageId: sendResult.messageId };
}
