import { Hono } from "hono";

import { generationRateLimit } from "../agents/workflow-generator/config";
import { checkGenerationRateLimit } from "../agents/workflow-generator/rate-limit";
import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { getAgentByName } from "../durable-objects/agent-utils";

const generateRoutes = new Hono<ApiContext>();

/**
 * WebSocket endpoint for workflow generation.
 *
 * The client mints the id, and it is the workflow id: the WorkflowAgent this
 * lands on is the same object the editor will open once the workflow is saved.
 * Unlike the editor socket, the organization has to travel as a header too,
 * because at connect time there may be no workflow record to derive it from.
 */
generateRoutes.get("/:workflowId", jwtMiddleware, async (c) => {
  const jwtPayload = c.var.jwtPayload;
  const userId = jwtPayload?.sub;
  const organizationId = c.get("organizationId");

  if (!userId || !organizationId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const verdict = await checkGenerationRateLimit(c.env.KV, organizationId, {
    max: generationRateLimit(c.env.CLOUDFLARE_ENV),
  });
  if (!verdict.allowed) {
    return c.json(
      {
        error: `Too many generations. Try again in ${Math.ceil(verdict.retryAfterSeconds / 60)} minute(s).`,
      },
      429,
      { "Retry-After": String(verdict.retryAfterSeconds) }
    );
  }

  const workflowId = c.req.param("workflowId")!;

  // getAgentByName initializes the partyserver name before returning the stub
  const stub = await getAgentByName(c.env.WORKFLOW_AGENT, workflowId);

  const headers = new Headers(c.req.raw.headers);
  // `set`, not append: like the identity headers, the protocol tag is the
  // route's claim about this socket and must override anything the client
  // put there.
  headers.set("X-Agent-Protocol", "generation");
  headers.set("X-User-Id", userId);
  headers.set("X-Organization-Id", organizationId);
  headers.set("X-Developer-Mode", jwtPayload?.developerMode ? "true" : "false");

  return stub.fetch(
    new Request(c.req.url, {
      method: c.req.method,
      headers,
      body: c.req.raw.body,
    })
  );
});

export default generateRoutes;
