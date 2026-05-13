import type {
  CreateEmailRequest,
  CreateEmailResponse,
  DeleteEmailResponse,
  GetEmailResponse,
  ListEmailsResponse,
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

export default emailRoutes;
