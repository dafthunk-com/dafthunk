import { Hono } from "hono";

import { checkGenerationRateLimit } from "../agents/workflow-generator/rate-limit";
import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { getAgentByName } from "../durable-objects/agent-utils";
import { developerModeMiddleware } from "../middleware/developer";

const generateRoutes = new Hono<ApiContext>();

/**
 * WebSocket endpoint for workflow generation.
 *
 * Keyed by a client-generated session id — there is no workflow yet. Unlike the
 * editor socket, the organization has to travel as a header too, because the DO
 * has no workflow record to derive it from.
 */
generateRoutes.get(
  "/:sessionId",
  jwtMiddleware,
  developerModeMiddleware,
  async (c) => {
    const jwtPayload = c.var.jwtPayload;
    const userId = jwtPayload?.sub;
    const organizationId = c.get("organizationId");

    if (!userId || !organizationId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const verdict = await checkGenerationRateLimit(c.env.KV, organizationId);
    if (!verdict.allowed) {
      return c.json(
        {
          error: `Too many generations. Try again in ${Math.ceil(verdict.retryAfterSeconds / 60)} minute(s).`,
        },
        429,
        { "Retry-After": String(verdict.retryAfterSeconds) }
      );
    }

    const sessionId = c.req.param("sessionId")!;

    // getAgentByName initializes the partyserver name before returning the stub
    const stub = await getAgentByName(
      c.env.WORKFLOW_GENERATOR_AGENT,
      sessionId
    );

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-User-Id", userId);
    headers.set("X-Organization-Id", organizationId);
    headers.set(
      "X-Developer-Mode",
      jwtPayload?.developerMode ? "true" : "false"
    );

    return stub.fetch(
      new Request(c.req.url, {
        method: c.req.method,
        headers,
        body: c.req.raw.body,
      })
    );
  }
);

export default generateRoutes;
