import type {
  CreateEmailRequest,
  CreateEmailResponse,
  DeleteEmailResponse,
  DeleteSenderEmailResponse,
  GetEmailResponse,
  GetSenderEmailResponse,
  ListEmailsResponse,
  SetSenderEmailRequest,
  SetSenderEmailResponse,
  UpdateEmailRequest,
  UpdateEmailResponse,
  VerifySenderEmailResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  clearEmailSenderEmail,
  createDatabase,
  createEmail,
  deleteEmail,
  getEmail,
  getEmailSenderEmail,
  getEmails,
  isOrganizationAdminOrOwner,
  updateEmail,
  updateEmailSenderEmail,
} from "../db";
import { createSesVerificationService } from "../services/ses-verification-service";

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

    const newEmail = await createEmail(db, {
      id: emailId,
      name: emailName,
      organizationId: organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateEmailResponse = {
      id: newEmail.id,
      name: newEmail.name,
      senderEmail: newEmail.senderEmail,
      senderEmailStatus: newEmail.senderEmailStatus,
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
    senderEmail: email.senderEmail,
    senderEmailStatus: email.senderEmailStatus,
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
      senderEmail: updatedEmail.senderEmail,
      senderEmailStatus: updatedEmail.senderEmailStatus,
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

/**
 * GET /api/emails/:id/sender-email
 *
 * Get the sender email configuration for an email
 */
emailRoutes.get("/:id/sender-email", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const result = await getEmailSenderEmail(db, id, organizationId);
  if (!result) {
    return c.json({ error: "Email not found" }, 404);
  }

  const response: GetSenderEmailResponse = {
    senderEmail: result.senderEmail,
    senderEmailStatus: result.senderEmailStatus,
  };
  return c.json(response);
});

/**
 * PUT /api/emails/:id/sender-email
 *
 * Set the sender email for an email and trigger SES verification
 */
emailRoutes.put(
  "/:id/sender-email",
  zValidator(
    "json",
    z.object({
      email: z.string().email("Valid email is required"),
    }) as z.ZodType<SetSenderEmailRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;
    const userId = c.get("jwtPayload")!.sub;

    if (!(await isOrganizationAdminOrOwner(db, organizationId, userId))) {
      return c.json(
        { error: "Only admins and owners can manage sender emails" },
        403
      );
    }

    const existingEmail = await getEmail(db, id, organizationId);
    if (!existingEmail) {
      return c.json({ error: "Email not found" }, 404);
    }

    const { email } = c.req.valid("json");

    try {
      const sesService = createSesVerificationService(c.env);
      if (!sesService) {
        return c.json({ error: "Email verification is not configured" }, 503);
      }

      await sesService.verifyEmailIdentity(email);
      await updateEmailSenderEmail(db, id, organizationId, email, "pending");

      const response: SetSenderEmailResponse = {
        senderEmail: email,
        senderEmailStatus: "pending",
      };
      return c.json(response);
    } catch (error) {
      console.error("Error setting sender email:", error);
      return c.json({ error: "Failed to set sender email" }, 500);
    }
  }
);

/**
 * POST /api/emails/:id/sender-email/verify
 *
 * Check the SES verification status and update the cached status
 */
emailRoutes.post("/:id/sender-email/verify", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;
  const userId = c.get("jwtPayload")!.sub;

  if (!(await isOrganizationAdminOrOwner(db, organizationId, userId))) {
    return c.json(
      { error: "Only admins and owners can manage sender emails" },
      403
    );
  }

  try {
    const result = await getEmailSenderEmail(db, id, organizationId);
    if (!result) {
      return c.json({ error: "Email not found" }, 404);
    }
    if (!result.senderEmail) {
      return c.json({ error: "No sender email configured" }, 404);
    }

    const sesService = createSesVerificationService(c.env);
    if (!sesService) {
      return c.json({ error: "Email verification is not configured" }, 503);
    }

    const sesStatus = await sesService.getVerificationStatus(
      result.senderEmail
    );

    let status: "pending" | "verified" | "failed";
    switch (sesStatus) {
      case "Success":
        status = "verified";
        break;
      case "Failed":
      case "TemporaryFailure":
      case "NotStarted":
        status = "failed";
        break;
      default:
        status = "pending";
        break;
    }

    await updateEmailSenderEmail(
      db,
      id,
      organizationId,
      result.senderEmail,
      status
    );

    const response: VerifySenderEmailResponse = {
      senderEmail: result.senderEmail,
      senderEmailStatus: status,
    };
    return c.json(response);
  } catch (error) {
    console.error("Error verifying sender email:", error);
    return c.json({ error: "Failed to verify sender email" }, 500);
  }
});

/**
 * DELETE /api/emails/:id/sender-email
 *
 * Remove the sender email configuration and delete the identity from SES
 */
emailRoutes.delete("/:id/sender-email", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;
  const userId = c.get("jwtPayload")!.sub;

  if (!(await isOrganizationAdminOrOwner(db, organizationId, userId))) {
    return c.json(
      { error: "Only admins and owners can manage sender emails" },
      403
    );
  }

  try {
    const result = await getEmailSenderEmail(db, id, organizationId);
    if (!result) {
      return c.json({ error: "Email not found" }, 404);
    }
    if (!result.senderEmail) {
      return c.json({ error: "No sender email configured" }, 404);
    }

    const sesService = createSesVerificationService(c.env);
    if (sesService) {
      await sesService.deleteIdentity(result.senderEmail);
    }

    await clearEmailSenderEmail(db, id, organizationId);

    const response: DeleteSenderEmailResponse = { success: true };
    return c.json(response);
  } catch (error) {
    console.error("Error deleting sender email:", error);
    return c.json({ error: "Failed to delete sender email" }, 500);
  }
});

export default emailRoutes;
