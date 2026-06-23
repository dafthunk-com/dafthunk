import type {
  CreateEmailRequest,
  CreateEmailResponse,
  DeleteEmailResponse,
  GetEmailResponse,
  GetMailboxThreadResponse,
  ListEmailsResponse,
  ListMailboxThreadsResponse,
  MailboxAttachmentSummary,
  UpdateEmailRequest,
  UpdateEmailResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  createDatabase,
  createEmail,
  deleteEmail,
  getEmail,
  getEmails,
  updateEmail,
} from "../db";
import type { EmailRow } from "../db/schema";
import { inboxKeys } from "../support-storage";
import {
  formatEmailAddress,
  generateEmailHandle,
  isUniqueHandleError,
} from "../utils/email-handle";

// Extend the ApiContext with our custom variable
type ExtendedApiContext = ApiContext & {
  Variables: {
    organizationId?: string;
  };
};

const MAX_HANDLE_ATTEMPTS = 5;

const emailRoutes = new Hono<ExtendedApiContext>();

// Apply JWT middleware to all email routes
emailRoutes.use("*", jwtMiddleware);

const nameSchema = z.string().trim().min(1, "Email name is required").max(120);

// Defense-in-depth headers shared by every blob response. Bodies and
// attachments may carry attacker-influenced content, so they must never render
// same-origin: nosniff + a CSP sandbox + a forced download disposition together
// neutralise script execution and top-level navigation. The frontend reads
// these via `fetch()`, which ignores the headers, so rendering still works.
const blobSecurityHeaders = (
  contentType: string,
  filename: string
): Record<string, string> => ({
  "Content-Type": contentType,
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "sandbox",
  "Content-Disposition": `attachment; filename="${filename.replace(/["\r\n]/g, "")}"`,
});

const toEmailPayload = (
  email: Pick<EmailRow, "id" | "name" | "handle" | "createdAt" | "updatedAt">,
  domain: string
) => ({
  id: email.id,
  name: email.name,
  handle: email.handle,
  address: formatEmailAddress(email.handle, domain),
  createdAt: email.createdAt,
  updatedAt: email.updatedAt,
});

/**
 * List all emails for the current organization
 */
emailRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allEmails = await getEmails(db, organizationId);

  const response: ListEmailsResponse = {
    emails: allEmails.map((email) => toEmailPayload(email, c.env.EMAIL_DOMAIN)),
  };
  return c.json(response);
});

/**
 * Create a new email for the current organization
 */
emailRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: nameSchema,
    }) as z.ZodType<CreateEmailRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const now = new Date();
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    const emailName = data.name;

    let created: EmailRow | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_HANDLE_ATTEMPTS; attempt++) {
      const handle = generateEmailHandle(emailName);
      try {
        created = await createEmail(db, {
          id: uuid(),
          name: emailName,
          handle,
          organizationId,
          createdAt: now,
          updatedAt: now,
        });
        break;
      } catch (err) {
        lastError = err;
        if (!isUniqueHandleError(err)) throw err;
      }
    }

    if (!created) {
      console.error("Failed to allocate unique email handle", lastError);
      return c.json({ error: "Failed to create email" }, 500);
    }

    const response: CreateEmailResponse = toEmailPayload(
      created,
      c.env.EMAIL_DOMAIN
    );

    return c.json(response, 201);
  }
);

/**
 * Get a specific email by ID
 */
emailRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const email = await getEmail(db, id, organizationId);
  if (!email) {
    return c.json({ error: "Email not found" }, 404);
  }

  const response: GetEmailResponse = toEmailPayload(email, c.env.EMAIL_DOMAIN);

  return c.json(response);
});

/**
 * Update an email by ID
 */
emailRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: nameSchema,
    }) as z.ZodType<UpdateEmailRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingEmail = await getEmail(db, id, organizationId);
    if (!existingEmail) {
      return c.json({ error: "Email not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();
    const nameChanged = data.name !== existingEmail.name;

    let updatedEmail: EmailRow | undefined;
    if (nameChanged) {
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_HANDLE_ATTEMPTS; attempt++) {
        const handle = generateEmailHandle(data.name);
        try {
          updatedEmail = await updateEmail(db, id, organizationId, {
            name: data.name,
            handle,
            updatedAt: now,
          });
          break;
        } catch (err) {
          lastError = err;
          if (!isUniqueHandleError(err)) throw err;
        }
      }

      if (!updatedEmail) {
        console.error(
          "Failed to allocate unique email handle on rename",
          lastError
        );
        return c.json({ error: "Failed to update email" }, 500);
      }
    } else {
      updatedEmail = await updateEmail(db, id, organizationId, {
        name: data.name,
        updatedAt: now,
      });
    }

    const response: UpdateEmailResponse = toEmailPayload(
      updatedEmail,
      c.env.EMAIL_DOMAIN
    );

    return c.json(response);
  }
);

/**
 * Delete an email by ID
 */
emailRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingEmail = await getEmail(db, id, organizationId);
  if (!existingEmail) {
    return c.json({ error: "Email not found" }, 404);
  }

  const deletedEmail = await deleteEmail(db, id, organizationId);
  if (!deletedEmail) {
    return c.json({ error: "Failed to delete email" }, 500);
  }

  const response: DeleteEmailResponse = { id: deletedEmail.id };
  return c.json(response);
});

// ── Read-only mailbox browsing ──────────────────────────────────────────────
//
// These endpoints let a user navigate the conversations recorded for one of
// their email addresses. They are strictly read-only: messages are written
// exclusively by workflow nodes through the Mailbox Durable Object. Each
// endpoint first confirms the address belongs to the caller's organization,
// then reads from the per-org mailbox (`mailbox:{organizationId}`).

const mailboxStub = (env: ApiContext["Bindings"], organizationId: string) =>
  env.MAILBOX.get(env.MAILBOX.idFromName(`mailbox:${organizationId}`));

/** List the conversations recorded for an email address (newest first). */
emailRoutes.get(
  "/:id/threads",
  zValidator(
    "query",
    z.object({
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
      search: z.string().trim().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    const email = await getEmail(db, id, organizationId);
    if (!email) {
      return c.json({ error: "Email not found" }, 404);
    }

    const { limit, offset, search } = c.req.valid("query");
    const threads = await mailboxStub(c.env, organizationId).listThreads(
      id,
      limit,
      offset,
      search
    );

    const response: ListMailboxThreadsResponse = {
      threads: threads.map((t) => ({
        id: t.id,
        subject: t.subject,
        fromEmail: t.fromEmail,
        lastMessageAt: t.lastMessageAt,
        createdAt: t.createdAt,
      })),
    };
    return c.json(response);
  }
);

/** A single conversation with its messages and attachment metadata. */
emailRoutes.get("/:id/threads/:threadId", async (c) => {
  const id = c.req.param("id");
  const threadId = c.req.param("threadId");
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);

  // These reads are independent: the ownership check (email exists, thread
  // belongs to it) gates the *response*, not the fetches, and the DO is already
  // scoped to the caller's org. Fetch them concurrently and validate after.
  const stub = mailboxStub(c.env, organizationId);
  const [email, thread, messages, attachmentRows] = await Promise.all([
    getEmail(db, id, organizationId),
    stub.getThread(threadId),
    stub.listThreadMessages(threadId),
    stub.listThreadAttachments(threadId),
  ]);

  if (!email) {
    return c.json({ error: "Email not found" }, 404);
  }
  // Confirm the thread really belongs to this address; the DO is per-org so a
  // mismatch means the caller addressed the wrong mailbox slot.
  if (!thread || thread.emailId !== id) {
    return c.json({ error: "Thread not found" }, 404);
  }

  const byMessage = new Map<string, MailboxAttachmentSummary[]>();
  for (const a of attachmentRows) {
    const list = byMessage.get(a.messageId) ?? [];
    list.push({
      id: a.id,
      filename: a.filename,
      contentType: a.contentType,
      sizeBytes: a.sizeBytes,
    });
    byMessage.set(a.messageId, list);
  }

  const response: GetMailboxThreadResponse = {
    thread: {
      id: thread.id,
      subject: thread.subject,
      fromEmail: thread.fromEmail,
      lastMessageAt: thread.lastMessageAt,
      createdAt: thread.createdAt,
    },
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      fromEmail: m.fromEmail,
      toEmail: m.toEmail,
      subject: m.subject,
      snippet: m.snippet,
      hasHtml: m.hasHtml,
      hasText: m.hasText,
      attachmentCount: m.attachmentCount,
      createdAt: m.createdAt,
      attachments: byMessage.get(m.id) ?? [],
    })),
  };
  return c.json(response);
});

/** Stream a message body part (text or html) from R2. */
emailRoutes.get(
  "/:id/messages/:messageId/body",
  zValidator(
    "query",
    z.object({ part: z.enum(["text", "html"]).default("text") })
  ),
  async (c) => {
    const id = c.req.param("id");
    const messageId = c.req.param("messageId");
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    const email = await getEmail(db, id, organizationId);
    if (!email) {
      return c.json({ error: "Email not found" }, 404);
    }

    const { part } = c.req.valid("query");
    const keys = inboxKeys(id, messageId);
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

    // R2 keys are namespaced by emailId, so a body only resolves when the
    // message genuinely lives under the address the caller just authorized.
    const obj = await c.env.INBOXES.get(bodyPart.key);
    if (!obj) {
      return c.json({ error: "Body part not stored" }, 404);
    }

    return new Response(obj.body, {
      status: 200,
      headers: blobSecurityHeaders(bodyPart.contentType, bodyPart.filename),
    });
  }
);

/** Download a single attachment blob from R2. */
emailRoutes.get("/:id/attachments/:attachmentId", async (c) => {
  const id = c.req.param("id");
  const attachmentId = c.req.param("attachmentId");
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);

  const email = await getEmail(db, id, organizationId);
  if (!email) {
    return c.json({ error: "Email not found" }, 404);
  }

  const att = await mailboxStub(c.env, organizationId).getAttachment(
    attachmentId
  );
  // The R2 key is prefixed with the owning emailId; require it to match the
  // addressed mailbox so one address can't read another's blobs.
  if (!att || !att.r2Key.startsWith(`${id}/`)) {
    return c.json({ error: "Attachment not found" }, 404);
  }

  const obj = await c.env.INBOXES.get(att.r2Key);
  if (!obj) {
    return c.json({ error: "Attachment blob missing" }, 404);
  }

  return new Response(obj.body, {
    status: 200,
    headers: {
      ...blobSecurityHeaders(att.contentType, att.filename),
      "Content-Length": String(att.sizeBytes),
    },
  });
});

export default emailRoutes;
