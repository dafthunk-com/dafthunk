import { Hono } from "hono";
import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";

const wsRoutes = new Hono<ApiContext>();

// WebSocket endpoint for real-time workflow state synchronization
wsRoutes.get("/", jwtMiddleware, async (c) => {
  const upgradeHeader = c.req.header("Upgrade");

  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.json({ error: "Expected WebSocket connection" }, 426);
  }

  const userId = c.var.jwtPayload?.sub;
  const workflowId = c.req.query("workflowId");

  if (!userId || !workflowId) {
    console.error("Missing userId or workflowId:", { userId, workflowId });
    return c.json({ error: "Missing userId or workflowId" }, 400);
  }

  // Create a unique DO ID for this user + workflow combination
  const doId = c.env.WORKFLOW_DO.idFromName(`${userId}-${workflowId}`);
  const stub = c.env.WORKFLOW_DO.get(doId);

  // Proxy the WebSocket connection to the Durable Object
  return stub.fetch(c.req.raw);
});

export default wsRoutes;
