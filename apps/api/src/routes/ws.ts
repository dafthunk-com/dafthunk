import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { getAgentByName } from "../durable-objects/agent-utils";

const wsRoutes = new Hono<ApiContext>();

// WebSocket endpoint for real-time workflow state synchronization
wsRoutes.get("/:workflowId", jwtMiddleware, async (c) => {
  const userId = c.var.jwtPayload?.sub;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const workflowId = c.req.param("workflowId")!;

  // getAgentByName initializes the partyserver name before returning the stub
  const stub = await getAgentByName(c.env.WORKFLOW_AGENT, workflowId);

  // Forward the WS upgrade request with userId header
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
