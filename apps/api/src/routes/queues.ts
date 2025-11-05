import type {
  CreateQueueRequest,
  CreateQueueResponse,
  DeleteQueueResponse,
  GetQueueResponse,
  ListQueuesResponse,
  QueueMessage,
  UpdateQueueRequest,
  UpdateQueueResponse,
  WorkflowMode,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  createDatabase,
  createHandle,
  createQueue,
  deleteQueue,
  getQueue,
  getQueues,
  updateQueue,
} from "../db";
import { getAuthContext } from "../utils/auth-context";

// Extend the ApiContext with our custom variable
type ExtendedApiContext = ApiContext & {
  Variables: {
    organizationId?: string;
  };
};

const queueRoutes = new Hono<ExtendedApiContext>();

// Apply JWT middleware to all queue routes
queueRoutes.use("*", jwtMiddleware);

/**
 * List all queues for the current organization
 */
queueRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allQueues = await getQueues(db, organizationId);

  const response: ListQueuesResponse = { queues: allQueues };
  return c.json(response);
});

/**
 * Create a new queue for the current organization
 */
queueRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Queue name is required"),
    }) as z.ZodType<CreateQueueRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const now = new Date();
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    const queueId = uuid();
    const queueName = data.name || "Untitled Queue";
    const queueHandle = createHandle(queueName);

    const newQueue = await createQueue(db, {
      id: queueId,
      name: queueName,
      handle: queueHandle,
      organizationId: organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateQueueResponse = {
      id: newQueue.id,
      name: newQueue.name,
      handle: newQueue.handle,
      createdAt: newQueue.createdAt,
      updatedAt: newQueue.updatedAt,
    };

    return c.json(response, 201);
  }
);

/**
 * Get a specific queue by ID
 */
queueRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const queue = await getQueue(db, id, organizationId);
  if (!queue) {
    return c.json({ error: "Queue not found" }, 404);
  }

  const response: GetQueueResponse = {
    id: queue.id,
    name: queue.name,
    handle: queue.handle,
    createdAt: queue.createdAt,
    updatedAt: queue.updatedAt,
  };

  return c.json(response);
});

/**
 * Update a queue by ID
 */
queueRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Queue name is required"),
    }) as z.ZodType<UpdateQueueRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingQueue = await getQueue(db, id, organizationId);
    if (!existingQueue) {
      return c.json({ error: "Queue not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();

    const updatedQueue = await updateQueue(db, id, organizationId, {
      name: data.name,
      updatedAt: now,
    });

    const response: UpdateQueueResponse = {
      id: updatedQueue.id,
      name: updatedQueue.name,
      handle: updatedQueue.handle,
      createdAt: updatedQueue.createdAt,
      updatedAt: updatedQueue.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Delete a queue by ID
 */
queueRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingQueue = await getQueue(db, id, organizationId);
  if (!existingQueue) {
    return c.json({ error: "Queue not found" }, 404);
  }

  const deletedQueue = await deleteQueue(db, id, organizationId);
  if (!deletedQueue) {
    return c.json({ error: "Failed to delete queue" }, 500);
  }

  const response: DeleteQueueResponse = { id: deletedQueue.id };
  return c.json(response);
});

/**
 * Publish a message to a queue in production mode
 * - Message will trigger workflows with active deployments
 */
queueRoutes.post(
  "/:queueIdOrHandle/publish",
  apiKeyOrJwtMiddleware,
  zValidator(
    "json",
    z.object({
      payload: z.unknown(),
    })
  ),
  async (c) => {
    const queueIdOrHandle = c.req.param("queueIdOrHandle");
    const { payload } = c.req.valid("json");
    const db = createDatabase(c.env.DB);

    // Get auth context from either JWT or API key
    const { organizationId } = getAuthContext(c);

    // Verify queue exists and belongs to organization
    const queue = await getQueue(db, queueIdOrHandle, organizationId);
    if (!queue) {
      return c.json(
        { error: "Queue not found or does not belong to your organization" },
        404
      );
    }

    // Create queue message with prod mode
    const mode: WorkflowMode = "prod";
    const queueMessage: QueueMessage = {
      queueId: queue.id,
      organizationId,
      payload,
      timestamp: Date.now(),
      mode,
    };

    try {
      // Publish to Cloudflare Queue
      await c.env.WORKFLOW_QUEUE.send(queueMessage);

      return c.json(
        {
          success: true,
          queueId: queue.id,
          mode: "prod",
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

/**
 * Publish a message to a queue in development mode
 * - Message will trigger workflows without active deployments (working version)
 */
queueRoutes.post(
  "/:queueIdOrHandle/publish/dev",
  apiKeyOrJwtMiddleware,
  zValidator(
    "json",
    z.object({
      payload: z.unknown(),
    })
  ),
  async (c) => {
    const queueIdOrHandle = c.req.param("queueIdOrHandle");
    const { payload } = c.req.valid("json");
    const db = createDatabase(c.env.DB);

    // Get auth context from either JWT or API key
    const { organizationId } = getAuthContext(c);

    // Verify queue exists and belongs to organization
    const queue = await getQueue(db, queueIdOrHandle, organizationId);
    if (!queue) {
      return c.json(
        { error: "Queue not found or does not belong to your organization" },
        404
      );
    }

    // Create queue message with dev mode
    const mode: WorkflowMode = "dev";
    const queueMessage: QueueMessage = {
      queueId: queue.id,
      organizationId,
      payload,
      timestamp: Date.now(),
      mode,
    };

    try {
      // Publish to Cloudflare Queue
      await c.env.WORKFLOW_QUEUE.send(queueMessage);

      return c.json(
        {
          success: true,
          queueId: queue.id,
          mode: "dev",
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

export default queueRoutes;
