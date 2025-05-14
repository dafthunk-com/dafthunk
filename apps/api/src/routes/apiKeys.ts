import { Hono } from "hono";
import { createApiKey, getApiKeys, deleteApiKey } from "../utils/db";
import { createDatabase } from "../db";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { jwtAuth } from "../auth";
import { ApiContext, CustomJWTPayload } from "../context";
import {
  ApiKeyWithSecret,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
  ListApiKeysResponse,
} from "@dafthunk/types";

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
    const response: ListApiKeysResponse = { apiKeys };
    return c.json(response);
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
    }) as z.ZodType<CreateApiKeyRequest>
  ),
  async (c) => {
    const user = c.get("jwtPayload") as CustomJWTPayload;
    const db = createDatabase(c.env.DB);
    const { name } = c.req.valid("json");

    try {
      const result = await createApiKey(db, user.organization.id, name);

      const apiKeyWithSecret: ApiKeyWithSecret = {
        apiKey: result.rawApiKey,
        id: result.apiKey.id,
        name: result.apiKey.name,
        createdAt: result.apiKey.createdAt,
      };

      const response: CreateApiKeyResponse = { apiKey: apiKeyWithSecret };
      return c.json(response, 201);
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

    const response: DeleteApiKeyResponse = { success };

    if (success) {
      return c.json(response);
    } else {
      return c.json({ error: "API key not found" }, 404);
    }
  } catch (error) {
    console.error("Error deleting API key:", error);
    return c.json({ error: "Failed to delete API key" }, 500);
  }
});

export default apiKeyRoutes;
