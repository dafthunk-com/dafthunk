import {
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
  createHandle,
  deleteEmail,
  getEmail,
  getEmails,
  updateEmail,
} from "../db";

// Extend the ApiContext with our custom variable
type ExtendedApiContext = ApiContext & {
  Variables: {
    organizationId?: string;
  };
};

const emailRoutes = new Hono<ExtendedApiContext>();

// Apply JWT middleware to all email routes
emailRoutes.use("*", jwtMiddleware);

/**
 * List all emails for the current organization
 */
emailRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allEmails = await getEmails(db, organizationId);

  const response: ListEmailsResponse = { emails: allEmails };
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
      name: z.string().min(1, "Email name is required"),
    }) as z.ZodType<CreateEmailRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const now = new Date();
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    const emailId = uuid();
    const emailName = data.name || "Untitled Email";
    const emailHandle = createHandle(emailName);

    const newEmail = await createEmail(db, {
      id: emailId,
      name: emailName,
      handle: emailHandle,
      organizationId: organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateEmailResponse = {
      id: newEmail.id,
      name: newEmail.name,
      handle: newEmail.handle,
      createdAt: newEmail.createdAt,
      updatedAt: newEmail.updatedAt,
    };

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

  const response: GetEmailResponse = {
    id: email.id,
    name: email.name,
    handle: email.handle,
    createdAt: email.createdAt,
    updatedAt: email.updatedAt,
  };

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
      name: z.string().min(1, "Email name is required"),
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

    const updatedEmail = await updateEmail(db, id, organizationId, {
      name: data.name,
      updatedAt: now,
    });

    const response: UpdateEmailResponse = {
      id: updatedEmail.id,
      name: updatedEmail.name,
      handle: updatedEmail.handle,
      createdAt: updatedEmail.createdAt,
      updatedAt: updatedEmail.updatedAt,
    };

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
