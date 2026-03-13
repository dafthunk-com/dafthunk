import type { QueueMessage } from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { ApiContext } from "../context";
import { createDatabase, getQueueById, verifyApiKey } from "../db";

const queuePublishRoutes = new Hono<ApiContext>();

/**
 * Publish a message to a queue.
 * Authentication via API key validated against the queue's organization.
 * No organization ID required in the URL — derived from the queue record.
 */
queuePublishRoutes.post(
  "/:queueId/publish",
  zValidator(
    "json",
    z.object({
      payload: z.unknown(),
    })
  ),
  async (c) => {
    const queueId = c.req.param("queueId");
    const db = createDatabase(c.env.DB);

    // Look up queue by ID (globally unique)
    const queue = await getQueueById(db, queueId);
    if (!queue) {
      return c.json({ error: "Queue not found" }, 404);
    }

    const organizationId = queue.organizationId;

    // Authenticate via API key against the queue's organization
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "API key is required" }, 401);
    }

    const apiKey = authHeader.substring(7);
    const validatedOrgId = await verifyApiKey(db, apiKey, organizationId);
    if (!validatedOrgId) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    const { payload } = c.req.valid("json");

    const queueMessage: QueueMessage = {
      queueId: queue.id,
      organizationId,
      payload,
      timestamp: Date.now(),
    };

    try {
      await c.env.WORKFLOW_QUEUE.send(queueMessage);

      return c.json(
        {
          success: true,
          queueId: queue.id,
          timestamp: queueMessage.timestamp,
        },
        201
      );
    } catch (error) {
      return c.json(
        {
          error: `Failed to publish message: ${error instanceof Error ? error.message : String(error)}`,
        },
        500
      );
    }
  }
);

export default queuePublishRoutes;
