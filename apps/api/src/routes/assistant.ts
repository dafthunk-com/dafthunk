import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { getAgentByName } from "../durable-objects/agent-utils";

const assistantRoutes = new Hono<ApiContext>();

assistantRoutes.get("/", jwtMiddleware, async (c) => {
  const userId = c.var.jwtPayload?.sub;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const orgId = c.get("organizationId");
  if (!orgId) {
    return c.json({ error: "Organization required" }, 400);
  }

  const stub = await getAgentByName(c.env.DAFTHUNK_AGENT, orgId);

  const headers = new Headers(c.req.raw.headers);
  headers.set("X-User-Id", userId);
  headers.set("X-Organization-Id", orgId);
  const newReq = new Request(c.req.url, {
    method: c.req.method,
    headers,
    body: c.req.raw.body,
  });

  return stub.fetch(newReq);
});

export default assistantRoutes;
