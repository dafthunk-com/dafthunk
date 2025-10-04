import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";

const wsRoutes = new Hono<ApiContext>();

// WebSocket endpoint for real-time workflow state synchronization
wsRoutes.get("/:workflowId", jwtMiddleware, async (c) => {
  const upgradeHeader = c.req.header("Upgrade");

  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.json({ error: "Expected WebSocket connection" }, 426);
  }

  const userId = c.var.jwtPayload?.sub;
  const workflowId = c.req.param("workflowId");
  const organizationId = c.get("organizationId")!;

  if (!userId || !organizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Create a unique DO ID for this user + workflow combination
  const doId = c.env.DURABLE_WORKFLOW.idFromName(`${userId}-${workflowId}`);
  const stub = c.env.DURABLE_WORKFLOW.get(doId);

  // Reconstruct request with required query params for DO
  const url = new URL(c.req.url);
  url.searchParams.set("organizationId", organizationId);
  url.searchParams.set("workflowId", workflowId);
  const newReq = new Request(url.toString(), c.req.raw);
  return stub.fetch(newReq);
});

export default wsRoutes;
