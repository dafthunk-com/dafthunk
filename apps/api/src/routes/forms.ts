/**
 * Public Form Routes
 *
 * These routes are unauthenticated — the signed token IS the authorization.
 * They allow external users to view and submit human-in-the-loop forms
 * via a shareable URL.
 */

import { verifyFormToken } from "@dafthunk/runtime";
import type { Field } from "@dafthunk/types";
import { Hono } from "hono";

import type { ApiContext } from "../context";
import { getAgentByName } from "../durable-objects/agent-utils";
import { CloudflareObjectStore } from "../runtime/cloudflare-object-store";
import { buildMultipartRecord } from "./form-upload";

const formRoutes = new Hono<ApiContext>();

/**
 * GET /forms/:signedToken
 *
 * Returns the form configuration (title, description, fields) and
 * submission status. No authentication required.
 */
formRoutes.get("/:signedToken", async (c) => {
  const signedToken = c.req.param("signedToken");
  const payload = await verifyFormToken(signedToken, c.env.FORM_SIGNING_KEY);

  if (!payload) {
    return c.json({ error: "Invalid or expired form link" }, 400);
  }

  try {
    const agent = await getAgentByName(c.env.WORKFLOW_AGENT, payload.wid);
    const { submitted, schema } = await agent.getFormStatus(payload.tok);

    if (!schema) {
      return c.json(
        { error: "Form schema not yet available. Please try again shortly." },
        404
      );
    }

    const parsed = JSON.parse(schema) as {
      title: string;
      description?: string;
      fields: Field[];
    };

    return c.json({
      title: parsed.title,
      description: parsed.description,
      fields: parsed.fields,
      submitted,
    });
  } catch (error) {
    console.error("Error loading form:", error);
    return c.json({ error: "Failed to load form" }, 500);
  }
});

/**
 * POST /forms/:signedToken
 *
 * Submit a form response. Validates the token, checks for duplicate
 * submissions, and sends the event to resume the paused workflow.
 */
formRoutes.post("/:signedToken", async (c) => {
  const signedToken = c.req.param("signedToken");
  const payload = await verifyFormToken(signedToken, c.env.FORM_SIGNING_KEY);

  if (!payload) {
    return c.json({ error: "Invalid or expired form link" }, 400);
  }

  try {
    const agent = await getAgentByName(c.env.WORKFLOW_AGENT, payload.wid);

    const contentType = c.req.header("content-type") ?? "";
    let body: Record<string, unknown>;

    if (contentType.includes("multipart/form-data")) {
      // File uploads: resolve the schema (for field types) and org (to scope
      // the R2 write), then store each file and merge its reference.
      const { schema, organizationId } = await agent.getFormStatus(payload.tok);
      if (!schema || !organizationId) {
        return c.json({ error: "Form is not ready for file uploads." }, 409);
      }
      const fields = (JSON.parse(schema) as { fields: Field[] }).fields ?? [];
      const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
      const form = await c.req.formData();
      try {
        body = await buildMultipartRecord(
          form,
          fields,
          organizationId,
          objectStore
        );
      } catch (error) {
        return c.json(
          {
            error:
              error instanceof Error ? error.message : "Invalid form upload",
          },
          400
        );
      }
    } else {
      body = await c.req.json<Record<string, unknown>>();
    }

    const result = await agent.checkAndSubmitForm(
      payload.tok,
      payload.eid,
      body
    );

    if (!result.success) {
      return c.json({ error: result.error }, 409);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error submitting form:", error);
    return c.json({ error: "Failed to submit form" }, 500);
  }
});

export default formRoutes;
