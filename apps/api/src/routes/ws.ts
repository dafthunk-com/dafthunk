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

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Create a unique DO ID for this user
  const doId = c.env.WORKFLOW_SESSION.idFromName(userId);
  const stub = c.env.WORKFLOW_SESSION.get(doId);

  // Pass the original request with userId in a custom header
  const headers = new Headers(c.req.raw.headers);
  headers.set("X-User-Id", userId);
  const newReq = new Request(c.req.url, {
    method: c.req.method,
    headers,
    body: c.req.raw.body,
  });

  return stub.fetch(newReq);
});

export default wsRoutes;
