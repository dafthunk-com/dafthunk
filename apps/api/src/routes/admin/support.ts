import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

import { ApiContext } from "../../context";
import {
  attachments,
  createDatabase,
  getLastInboundMessage,
  insertMessage,
  MessageDirection,
  messages,
  organizations,
  threadReads,
  ThreadStatus,
  type ThreadStatusType,
  threads,
  users,
} from "../../db";
import { createEmailService } from "../../services/email-service";
import { buildSnippet, stripHtml } from "../../support-utils";

const adminSupportRoutes = new Hono<ApiContext>();

const statusEnum = z.enum([
  ThreadStatus.OPEN,
  ThreadStatus.PENDING,
  ThreadStatus.CLOSED,
]);

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
        organizationId: threads.organizationId,
        organizationName: organizations.name,
        lastReadAt: threadReads.lastReadAt,
      })
      .from(threads)
      .leftJoin(users, eq(threads.userId, users.id))
      .leftJoin(organizations, eq(threads.organizationId, organizations.id))
      .leftJoin(
        threadReads,
        and(
          eq(threadReads.threadId, threads.id),
          adminUserId
            ? eq(threadReads.userId, adminUserId)
            : sql`1 = 0`
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
    .select({
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
      organizationId: threads.organizationId,
      organizationName: organizations.name,
    })
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

    const [msg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    if (!msg) {
      return c.json({ error: "Message not found" }, 404);
    }

    const filename = part === "html" ? "body.html" : "body.txt";
    const contentType =
      part === "html" ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
    const key = `support/${id}/${filename}`;
    const obj = await c.env.RESSOURCES.get(key);
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
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
        "Content-Disposition": `attachment; filename="${filename}"`,
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

  const obj = await c.env.RESSOURCES.get(att.r2Key);
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

    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);
    if (!thread) {
      return c.json({ error: "Thread not found" }, 404);
    }

    const lastInbound = await getLastInboundMessage(db, threadId);

    const subject = (body.subject ?? thread.subject).trim() || thread.subject;
    const from = c.env.SUPPORT_EMAIL_FROM;
    if (!from) {
      return c.json({ error: "SUPPORT_EMAIL_FROM is not configured" }, 500);
    }

    const emailService = createEmailService(c.env);
    if (!emailService) {
      return c.json({ error: "Email service not configured" }, 500);
    }

    const references = lastInbound?.referencesChain
      ? lastInbound.referencesChain.split(/\s+/).filter(Boolean)
      : [];
    const fullChain = buildReferencesChain(
      references,
      lastInbound?.rfc822MessageId ?? null
    );

    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
    const messageRowId = uuidv7();
    const fromDomain = from.includes("@") ? from.split("@")[1] : "mail.local";
    const rfc822MessageId = `<${messageRowId}@${fromDomain}>`;
    const rawR2Key = `support/${messageRowId}/raw.eml`;
    const adminUserId = c.get("jwtPayload")?.sub ?? null;

    // Pre-insert closes the gap where send succeeds but persistence doesn't —
    // the recipient would otherwise receive a reply we have no record of. The
    // unique index on rfc822_message_id also gives retry idempotency.
    try {
      await insertMessage(db, {
        id: messageRowId,
        threadId,
        direction: MessageDirection.OUTBOUND,
        rfc822MessageId,
        inReplyTo: lastInbound?.rfc822MessageId ?? null,
        referencesChain: fullChain,
        fromEmail: from,
        toEmail: thread.fromEmail,
        subject: replySubject,
        snippet: buildSnippet(body.text ?? stripHtml(body.html)),
        hasHtml: Boolean(body.html),
        hasText: Boolean(body.text),
        attachmentCount: 0,
        rawR2Key,
        authorAdminUserId: adminUserId,
      });
    } catch (error) {
      console.error("[support reply] pre-insert failed", error);
      return c.json({ error: "Failed to record outbound message" }, 500);
    }

    const sendResult = await emailService.sendThreaded({
      from,
      to: thread.fromEmail,
      subject: replySubject,
      ...(body.html ? { html: body.html } : {}),
      ...(body.text ? { text: body.text } : {}),
      ...(lastInbound?.rfc822MessageId
        ? { inReplyTo: lastInbound.rfc822MessageId }
        : {}),
      ...(references.length > 0 ? { references } : {}),
      messageId: rfc822MessageId,
    });

    if (!sendResult.success) {
      try {
        await db.delete(messages).where(eq(messages.id, messageRowId));
      } catch (cleanupError) {
        console.error(
          "[support reply] cleanup after send failure failed",
          cleanupError
        );
      }
      return c.json(
        { error: sendResult.error ?? "Failed to send email" },
        502
      );
    }

    // Email is already on the wire and the DB row is persisted. The MIME
    // archive and lastMessageAt bump are best-effort — defer them so the
    // admin client returns immediately instead of waiting on R2.
    const outboundMime = buildOutboundMimeArchive({
      from,
      to: thread.fromEmail,
      subject: replySubject,
      messageId: rfc822MessageId,
      inReplyTo: lastInbound?.rfc822MessageId ?? null,
      references,
      text: body.text,
      html: body.html,
      date: new Date(),
    });
    const now = new Date();
    c.executionCtx.waitUntil(
      Promise.allSettled([
        c.env.RESSOURCES.put(rawR2Key, outboundMime, {
          httpMetadata: { contentType: "message/rfc822" },
        }),
        db
          .update(threads)
          .set({ lastMessageAt: now, updatedAt: now })
          .where(eq(threads.id, threadId)),
      ]).then((results) => {
        results.forEach((r, i) => {
          if (r.status === "rejected") {
            console.error(
              `[support reply] deferred task ${i} failed`,
              r.reason
            );
          }
        });
      })
    );

    return c.json({ messageId: messageRowId });
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

function buildReferencesChain(
  existing: string[],
  lastInboundId: string | null
): string | null {
  if (existing.length === 0 && !lastInboundId) return null;
  const chain = lastInboundId ? [...existing, lastInboundId] : existing;
  return Array.from(new Set(chain)).join(" ");
}

function buildOutboundMimeArchive(args: {
  from: string;
  to: string;
  subject: string;
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  text?: string;
  html?: string;
  date: Date;
}): Uint8Array {
  const boundary = `dafthunk-${uuidv7()}`;
  const headers: string[] = [
    `From: ${args.from}`,
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    `Date: ${args.date.toUTCString()}`,
    `Message-ID: ${args.messageId}`,
  ];
  if (args.inReplyTo) headers.push(`In-Reply-To: ${args.inReplyTo}`);
  if (args.references.length > 0) {
    headers.push(`References: ${args.references.join(" ")}`);
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

  const mime = headers.join("\r\n") + "\r\n" + body;
  return new TextEncoder().encode(mime);
}

export default adminSupportRoutes;
