import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import {
  attachments,
  createDatabase,
  createThread,
  findUserByEmail,
  getInboxByAlias,
  messages,
  organizations,
  selectLastInboundMessage,
  ThreadStatus,
  type ThreadStatusType,
  threadReads,
  threads,
  users,
} from "../../db";
import { sendOutboundSupportMessage } from "../../support-send";
import { inboxKeys, SUPPORT_INBOX_ALIAS } from "../../support-storage";

const adminSupportRoutes = new Hono<ApiContext>();

const statusEnum = z.enum([
  ThreadStatus.OPEN,
  ThreadStatus.PENDING,
  ThreadStatus.CLOSED,
]);

const threadSummaryColumns = {
  id: threads.id,
  subject: threads.subject,
  fromEmail: threads.fromEmail,
  fromName: threads.fromName,
  status: threads.status,
  lastMessageAt: threads.lastMessageAt,
  createdAt: threads.createdAt,
  updatedAt: threads.updatedAt,
  userId: threads.userId,
  userName: users.name,
  userAvatarUrl: users.avatarUrl,
  organizationId: threads.organizationId,
  organizationName: organizations.name,
} as const;

/** GET /admin/support/threads — paginated. `unread` projected per row. */
adminSupportRoutes.get(
  "/threads",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      status: statusEnum.optional(),
      search: z.string().optional(),
    })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const { page, limit, status, search } = c.req.valid("query");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(threads.status, status));
    if (search) {
      const like_ = `%${search}%`;
      conditions.push(
        sql`(${threads.subject} LIKE ${like_} OR ${threads.fromEmail} LIKE ${like_})`
      );
    }
    const whereClause =
      conditions.length > 0
        ? sql`${sql.join(conditions, sql` AND `)}`
        : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(threads)
      .where(whereClause);

    const adminUserId = c.get("jwtPayload")?.sub;

    const rows = await db
      .select({
        ...threadSummaryColumns,
        lastReadAt: threadReads.lastReadAt,
      })
      .from(threads)
      .leftJoin(users, eq(threads.userId, users.id))
      .leftJoin(organizations, eq(threads.organizationId, organizations.id))
      .leftJoin(
        threadReads,
        and(
          eq(threadReads.threadId, threads.id),
          adminUserId ? eq(threadReads.userId, adminUserId) : sql`1 = 0`
        )
      )
      .where(whereClause)
      .orderBy(desc(threads.lastMessageAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      threads: rows.map(({ lastReadAt, ...rest }) => ({
        ...rest,
        unread: lastReadAt === null || lastReadAt < rest.lastMessageAt,
      })),
      pagination: {
        page,
        limit,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      },
    });
  }
);

/** GET /admin/support/unread-count — drives the sidebar badge. */
adminSupportRoutes.get("/unread-count", async (c) => {
  const db = createDatabase(c.env.DB);
  const adminUserId = c.get("jwtPayload")?.sub;
  if (!adminUserId) return c.json({ count: 0 });

  const [row] = await db
    .select({ count: sql<number>`COUNT()` })
    .from(threads)
    .leftJoin(
      threadReads,
      and(
        eq(threadReads.threadId, threads.id),
        eq(threadReads.userId, adminUserId)
      )
    )
    .where(
      or(
        isNull(threadReads.lastReadAt),
        lt(threadReads.lastReadAt, threads.lastMessageAt)
      )
    );

  return c.json({ count: row?.count ?? 0 });
});

/** GET /admin/support/threads/:id — thread + messages + attachment metadata. */
adminSupportRoutes.get("/threads/:id", async (c) => {
  const db = createDatabase(c.env.DB);
  const id = c.req.param("id");

  const [thread] = await db
    .select(threadSummaryColumns)
    .from(threads)
    .leftJoin(users, eq(threads.userId, users.id))
    .leftJoin(organizations, eq(threads.organizationId, organizations.id))
    .where(eq(threads.id, id))
    .limit(1);

  if (!thread) {
    return c.json({ error: "Thread not found" }, 404);
  }

  const messageRows = await db
    .select()
    .from(messages)
    .where(eq(messages.threadId, id))
    .orderBy(asc(messages.createdAt));

  const messageIds = messageRows.map((m) => m.id);
  const attachmentRows = messageIds.length
    ? await db
        .select()
        .from(attachments)
        .where(inArray(attachments.messageId, messageIds))
    : [];

  const attachmentsByMessage = new Map<string, typeof attachmentRows>();
  for (const a of attachmentRows) {
    const list = attachmentsByMessage.get(a.messageId) ?? [];
    list.push(a);
    attachmentsByMessage.set(a.messageId, list);
  }

  const adminUserId = c.get("jwtPayload")?.sub;
  if (adminUserId) {
    const now = new Date();
    try {
      await db
        .insert(threadReads)
        .values({ threadId: id, userId: adminUserId, lastReadAt: now })
        .onConflictDoUpdate({
          target: [threadReads.threadId, threadReads.userId],
          set: { lastReadAt: now },
        });
    } catch (error) {
      // Read tracking is best-effort — never fail the request because the
      // badge couldn't update.
      console.error("[support] failed to mark thread as read", error);
    }
  }

  return c.json({
    thread,
    messages: messageRows.map((m) => ({
      ...m,
      attachments: (attachmentsByMessage.get(m.id) ?? []).map((a) => ({
        id: a.id,
        filename: a.filename,
        contentType: a.contentType,
        sizeBytes: a.sizeBytes,
        contentId: a.contentId,
      })),
    })),
  });
});

/** GET /admin/support/messages/:id/body?part=text|html — streams from R2. */
adminSupportRoutes.get(
  "/messages/:id/body",
  zValidator(
    "query",
    z.object({
      part: z.enum(["text", "html"]).default("text"),
    })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param("id");
    const { part } = c.req.valid("query");

    const [row] = await db
      .select({ inboxId: threads.inboxId })
      .from(messages)
      .innerJoin(threads, eq(threads.id, messages.threadId))
      .where(eq(messages.id, id))
      .limit(1);
    if (!row) {
      return c.json({ error: "Message not found" }, 404);
    }

    const keys = inboxKeys(row.inboxId, id);
    const bodyPart =
      part === "html"
        ? {
            key: keys.htmlBody,
            filename: "body.html",
            contentType: "text/html; charset=utf-8",
          }
        : {
            key: keys.textBody,
            filename: "body.txt",
            contentType: "text/plain; charset=utf-8",
          };
    const obj = await c.env.INBOXES.get(bodyPart.key);
    if (!obj) {
      return c.json({ error: "Body part not stored" }, 404);
    }

    // Defense-in-depth: attacker-controlled HTML must never run same-origin.
    // Content-Disposition + CSP sandbox neutralise top-level navigation;
    // our `fetch()` call ignores these headers, so the iframe rendering
    // path keeps working.
    return new Response(obj.body, {
      status: 200,
      headers: {
        "Content-Type": bodyPart.contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
        "Content-Disposition": `attachment; filename="${bodyPart.filename}"`,
      },
    });
  }
);

/** GET /admin/support/attachments/:id — streams from R2 with download disposition. */
adminSupportRoutes.get("/attachments/:id", async (c) => {
  const db = createDatabase(c.env.DB);
  const id = c.req.param("id");

  const [att] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, id))
    .limit(1);
  if (!att) {
    return c.json({ error: "Attachment not found" }, 404);
  }

  const obj = await c.env.INBOXES.get(att.r2Key);
  if (!obj) {
    return c.json({ error: "Attachment blob missing" }, 404);
  }

  // Strip every byte that could break out of the quoted filename value.
  // Workers' `Headers` already rejects CR/LF, but nosniff + CSP sandbox +
  // the forced `attachment` disposition together guarantee the attacker
  // cannot get the response rendered same-origin even with a polyglot
  // Content-Type they picked at upload time.
  const safeFilename = att.filename.replace(/["\r\n]/g, "");
  return new Response(obj.body, {
    status: 200,
    headers: {
      "Content-Type": att.contentType,
      "Content-Length": String(att.sizeBytes),
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
});

/**
 * POST /admin/support/threads — admin-initiated outbound thread. Creates a
 * new thread addressed to an arbitrary email and sends the first message
 * via the shared outbound path. Auto-links to a registered user when the
 * recipient's address matches `users.email`.
 */
adminSupportRoutes.post(
  "/threads",
  zValidator(
    "json",
    z
      .object({
        toEmail: z.string().email(),
        subject: z.string().trim().min(1),
        text: z.string().optional(),
        html: z.string().optional(),
      })
      .refine((v) => Boolean(v.text || v.html), {
        message: "Provide at least one of 'text' or 'html'",
      })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const { toEmail, subject, text, html } = c.req.valid("json");
    const normalizedTo = toEmail.toLowerCase();

    const [inbox, linkedUser] = await Promise.all([
      getInboxByAlias(db, SUPPORT_INBOX_ALIAS),
      findUserByEmail(db, normalizedTo),
    ]);
    if (!inbox) {
      return c.json({ error: "Support inbox not configured" }, 500);
    }
    const now = new Date();
    const thread = await createThread(db, {
      inboxId: inbox.id,
      subject,
      fromEmail: normalizedTo,
      fromName: null,
      userId: linkedUser?.id ?? null,
      organizationId: linkedUser?.organizationId ?? null,
      status: ThreadStatus.OPEN,
      lastMessageAt: now,
    });

    const result = await sendOutboundSupportMessage(db, c.env, c.executionCtx, {
      threadId: thread.id,
      inboxId: inbox.id,
      toAddress: normalizedTo,
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
      adminUserId: c.get("jwtPayload")?.sub ?? null,
    });

    if (!result.ok) {
      // Roll back the thread we just created so a failed send doesn't leave
      // an orphaned empty thread in the inbox.
      try {
        await db.delete(threads).where(eq(threads.id, thread.id));
      } catch (cleanupError) {
        console.error("[support create] thread cleanup failed", cleanupError);
      }
      return c.json({ error: result.error }, result.status);
    }

    return c.json({ thread, messageId: result.messageId });
  }
);

/** POST /admin/support/threads/:id/reply — threaded reply via SUPPORT_EMAIL_FROM. */
adminSupportRoutes.post(
  "/threads/:id/reply",
  zValidator(
    "json",
    z
      .object({
        subject: z.string().optional(),
        text: z.string().optional(),
        html: z.string().optional(),
      })
      .refine((v) => Boolean(v.text || v.html), {
        message: "Provide at least one of 'text' or 'html'",
      })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const threadId = c.req.param("id");
    const body = c.req.valid("json");

    const [threadRows, lastInboundRows] = await db.batch([
      db
        .select({
          inboxId: threads.inboxId,
          subject: threads.subject,
          fromEmail: threads.fromEmail,
        })
        .from(threads)
        .where(eq(threads.id, threadId))
        .limit(1),
      selectLastInboundMessage(db, threadId),
    ]);
    const thread = threadRows[0];
    const lastInbound = lastInboundRows[0];
    if (!thread) {
      return c.json({ error: "Thread not found" }, 404);
    }
    const subject = (body.subject ?? thread.subject).trim() || thread.subject;
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
    const references = lastInbound?.referencesChain
      ? lastInbound.referencesChain.split(/\s+/).filter(Boolean)
      : [];

    const result = await sendOutboundSupportMessage(db, c.env, c.executionCtx, {
      threadId,
      inboxId: thread.inboxId,
      toAddress: thread.fromEmail,
      subject: replySubject,
      ...(body.text ? { text: body.text } : {}),
      ...(body.html ? { html: body.html } : {}),
      inReplyTo: lastInbound?.rfc822MessageId ?? null,
      references,
      adminUserId: c.get("jwtPayload")?.sub ?? null,
    });

    if (!result.ok) return c.json({ error: result.error }, result.status);
    return c.json({ messageId: result.messageId });
  }
);

/** PATCH /admin/support/threads/:id — close / reopen. */
adminSupportRoutes.patch(
  "/threads/:id",
  zValidator("json", z.object({ status: statusEnum })),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param("id");
    const { status } = c.req.valid("json");

    const result = await db
      .update(threads)
      .set({ status: status as ThreadStatusType, updatedAt: new Date() })
      .where(eq(threads.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: "Thread not found" }, 404);
    }
    return c.json({ thread: result[0] });
  }
);

export default adminSupportRoutes;
