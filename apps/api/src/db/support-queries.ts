import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import {
  type AttachmentInsert,
  attachments,
  type Database,
  MessageDirection,
  type MessageInsert,
  type MessageRow,
  messages,
  type ThreadInsert,
  type ThreadRow,
  threads,
  ThreadStatus,
  users,
} from "./index";

// Subject prefixes added by mail clients on reply/forward. Stripped before
// using subject as a thread-matching fallback so "Re: hello" matches "hello".
const SUBJECT_PREFIX_RE = /^(re|fwd?|aw|sv|tr)\s*(\[\d+\])?\s*:\s*/i;

/** Strip leading Re:/Fwd: prefixes (recursively) and collapse whitespace. */
export function normalizeSubject(subject: string): string {
  let s = subject.trim();
  while (SUBJECT_PREFIX_RE.test(s)) {
    s = s.replace(SUBJECT_PREFIX_RE, "");
  }
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Match an incoming message to an existing thread. Tries In-Reply-To /
 * References first (strict), then falls back to normalized-subject +
 * fromEmail within the last 30 days (lenient — covers clients that drop
 * threading headers on reply).
 */
export async function resolveThreadForInbound(
  db: Database,
  args: {
    inReplyTo: string | null;
    references: string[];
    fromEmail: string;
    subject: string;
  }
): Promise<ThreadRow | undefined> {
  const candidateRfcIds = [
    ...(args.inReplyTo ? [args.inReplyTo] : []),
    ...args.references,
  ];

  if (candidateRfcIds.length > 0) {
    const hits = await db
      .select({ threadId: messages.threadId })
      .from(messages)
      .where(inArray(messages.rfc822MessageId, candidateRfcIds))
      .limit(1);
    if (hits.length > 0) {
      const [thread] = await db
        .select()
        .from(threads)
        .where(eq(threads.id, hits[0].threadId))
        .limit(1);
      if (thread) return thread;
    }
  }

  const normalized = normalizeSubject(args.subject);
  if (!normalized) return undefined;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const candidates = await db
    .select()
    .from(threads)
    .where(
      and(
        eq(threads.fromEmail, args.fromEmail),
        gte(threads.lastMessageAt, thirtyDaysAgo)
      )
    )
    .orderBy(desc(threads.lastMessageAt))
    .limit(20);

  return candidates.find(
    (t) => normalizeSubject(t.subject) === normalized
  );
}

/** Look up a user by lowercased email; used to link inbound mail to the sender. */
export async function findUserByEmail(
  db: Database,
  email: string
): Promise<{ id: string; organizationId: string } | undefined> {
  const [hit] = await db
    .select({ id: users.id, organizationId: users.organizationId })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return hit;
}

export async function createThread(
  db: Database,
  values: Omit<ThreadInsert, "id">
): Promise<ThreadRow> {
  const id = uuidv7();
  const [row] = await db
    .insert(threads)
    .values({ id, ...values })
    .returning();
  return row;
}

export async function insertMessage(
  db: Database,
  values: MessageInsert
): Promise<MessageRow> {
  const [row] = await db.insert(messages).values(values).returning();
  return row;
}

export async function getLastInboundMessage(
  db: Database,
  threadId: string
): Promise<MessageRow | undefined> {
  const [row] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.threadId, threadId),
        eq(messages.direction, MessageDirection.INBOUND)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);
  return row;
}

export async function insertAttachments(
  db: Database,
  rows: AttachmentInsert[]
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(attachments).values(rows);
}

/**
 * Reopen and bump `lastMessageAt` on a thread that just received a new
 * inbound message. Closed threads are reopened (user replied to a resolved
 * conversation); pending threads also flip back to open.
 */
export async function touchThreadOnInbound(
  db: Database,
  threadId: string,
  lastMessageAt: Date
): Promise<void> {
  await db
    .update(threads)
    .set({
      lastMessageAt,
      status: ThreadStatus.OPEN,
      updatedAt: new Date(),
    })
    .where(eq(threads.id, threadId));
}
