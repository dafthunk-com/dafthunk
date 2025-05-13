import { Hono } from "hono";
import { createApiKey, getApiKeys, deleteApiKey } from "../utils/db";
import { createDatabase } from "../db";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { jwtAuth } from "../auth";
import { ApiContext, CustomJWTPayload } from "../context";

// Create a new Hono instance for API keys endpoints
const apiKeyRoutes = new Hono<ApiContext>();

// Apply authentication middleware to all routes
apiKeyRoutes.use("*", jwtAuth);

/**
 * GET /api/api-keys
 *
 * List all API keys for the current organization
 */
apiKeyRoutes.get("/", async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const db = createDatabase(c.env.DB);

  try {
    const apiKeys = await getApiKeys(db, user.organization.id);
    return c.json({ apiKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return c.json({ error: "Failed to fetch API keys" }, 500);
  }
});

/**
 * POST /api/api-keys
 *
 * Create a new API key for the current organization
 */
apiKeyRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "API key name is required"),
    })
  ),
  async (c) => {
    const user = c.get("jwtPayload") as CustomJWTPayload;
    const db = createDatabase(c.env.DB);
    const { name } = c.req.valid("json");

    try {
      const result = await createApiKey(db, user.organization.id, name);

      // Return both the raw API key (only shown once) and the API key record
      return c.json(
        {
          apiKey: result.rawApiKey,
          apiKeyRecord: {
            id: result.apiKey.id,
            name: result.apiKey.name,
            createdAt: result.apiKey.createdAt,
          },
        },
        201
      );
    } catch (error) {
      console.error("Error creating API key:", error);
      return c.json({ error: "Failed to create API key" }, 500);
    }
  }
);

/**
 * DELETE /api/api-keys/:id
 *
 * Delete an API key
 */
apiKeyRoutes.delete("/:id", async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const db = createDatabase(c.env.DB);
  const apiKeyId = c.req.param("id");

  try {
    const success = await deleteApiKey(db, apiKeyId, user.organization.id);

    if (success) {
      return c.json({ success: true });
    } else {
      return c.json({ error: "API key not found" }, 404);
    }
  } catch (error) {
    console.error("Error deleting API key:", error);
    return c.json({ error: "Failed to delete API key" }, 500);
  }
});

export default apiKeyRoutes;
