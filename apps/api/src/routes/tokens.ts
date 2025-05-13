import { Hono } from "hono";
import { createApiToken, getApiTokens, deleteApiToken } from "../utils/db";
import { createDatabase } from "../db";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { jwtAuth } from "../auth";
import { ApiContext, CustomJWTPayload } from "../context";

// Create a new Hono instance for tokens endpoints
const tokenRoutes = new Hono<ApiContext>();

// Apply authentication middleware to all routes
tokenRoutes.use("*", jwtAuth);

/**
 * GET /api/tokens
 *
 * List all API tokens for the current organization
 */
tokenRoutes.get("/", async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const db = createDatabase(c.env.DB);

  try {
    const tokens = await getApiTokens(db, user.organization.id);
    return c.json({ tokens });
  } catch (error) {
    console.error("Error fetching API tokens:", error);
    return c.json({ error: "Failed to fetch API tokens" }, 500);
  }
});

/**
 * POST /api/tokens
 *
 * Create a new API token for the current organization
 */
tokenRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Token name is required"),
    })
  ),
  async (c) => {
    const user = c.get("jwtPayload") as CustomJWTPayload;
    const db = createDatabase(c.env.DB);
    const { name } = c.req.valid("json");

    try {
      const result = await createApiToken(db, user.organization.id, name);

      // Return both the raw token (only shown once) and the token record
      return c.json(
        {
          token: result.rawToken,
          tokenRecord: {
            id: result.token.id,
            name: result.token.name,
            createdAt: result.token.createdAt,
          },
        },
        201
      );
    } catch (error) {
      console.error("Error creating API token:", error);
      return c.json({ error: "Failed to create API token" }, 500);
    }
  }
);

/**
 * DELETE /api/tokens/:id
 *
 * Delete an API token
 */
tokenRoutes.delete("/:id", async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const db = createDatabase(c.env.DB);
  const tokenId = c.req.param("id");

  try {
    const success = await deleteApiToken(db, tokenId, user.organization.id);

    if (success) {
      return c.json({ success: true });
    } else {
      return c.json({ error: "Token not found" }, 404);
    }
  } catch (error) {
    console.error("Error deleting API token:", error);
    return c.json({ error: "Failed to delete API token" }, 500);
  }
});

export default tokenRoutes;
