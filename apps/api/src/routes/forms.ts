/**
 * Public HITL Form Routes
 *
 * These routes are unauthenticated — the signed token IS the authorization.
 * They allow external users to view and submit human-in-the-loop forms
 * via a shareable URL.
 */

import { verifyHitlToken } from "@dafthunk/runtime";
import { Hono } from "hono";

import type { ApiContext } from "../context";
import { getAgentByName } from "../durable-objects/agent-utils";

const formRoutes = new Hono<ApiContext>();

/**
 * GET /forms/:signedToken
 *
 * Returns the form configuration (prompt, context, input type) and
 * submission status. No authentication required.
 */
formRoutes.get("/:signedToken", async (c) => {
  const signedToken = c.req.param("signedToken");
  const payload = await verifyHitlToken(signedToken, c.env.HITL_SIGNING_KEY);

  if (!payload) {
    return c.json({ error: "Invalid or expired form link" }, 400);
  }

  try {
    const agent = await getAgentByName(c.env.WORKFLOW_AGENT, payload.wid);
    const { submitted } = await agent.getHitlFormStatus(payload.tok);

    return c.json({
      prompt: payload.p,
      context: payload.c,
      inputType: payload.t,
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
  const payload = await verifyHitlToken(signedToken, c.env.HITL_SIGNING_KEY);

  if (!payload) {
    return c.json({ error: "Invalid or expired form link" }, 400);
  }

  const body = await c.req.json<{
    text?: string;
    approved?: boolean;
    metadata?: Record<string, unknown>;
  }>();

  try {
    const agent = await getAgentByName(c.env.WORKFLOW_AGENT, payload.wid);
    const result = await agent.checkAndSubmitHitlForm(
      payload.tok,
      payload.eid,
      {
        text: body.text,
        approved: body.approved,
        metadata: body.metadata,
      }
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
