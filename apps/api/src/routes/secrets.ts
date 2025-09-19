import {
  CreateSecretRequest,
  CreateSecretResponse,
  DeleteSecretResponse,
  GetSecretResponse,
  GetSecretValueResponse,
  ListSecretsResponse,
  UpdateSecretRequest,
  UpdateSecretResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase } from "../db";
import {
  createSecret,
  deleteSecret,
  getSecret,
  getSecrets,
  getSecretValue,
  updateSecret,
} from "../db";

// Create a new Hono instance for secrets endpoints
const secretRoutes = new Hono<ApiContext>();

// Apply authentication middleware to all routes
secretRoutes.use("*", jwtMiddleware);

/**
 * GET /api/secrets
 *
 * List all secrets for the current organization
 */
secretRoutes.get("/", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);

  try {
    const secrets = await getSecrets(db, organizationId);
    const response: ListSecretsResponse = { secrets };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching secrets:", error);
    return c.json({ error: "Failed to fetch secrets" }, 500);
  }
});

/**
 * POST /api/secrets
 *
 * Create a new secret for the current organization
 */
secretRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Secret name is required"),
      value: z.string().min(1, "Secret value is required"),
    }) as z.ZodType<CreateSecretRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);
    const { name, value } = c.req.valid("json");

    try {
      const result = await createSecret(db, organizationId, name, value, c.env);

      const response: CreateSecretResponse = {
        secret: {
          id: result.secret.id,
          name: result.secret.name,
          value: result.value,
          createdAt: result.secret.createdAt,
          updatedAt: result.secret.updatedAt,
        },
      };
      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating secret:", error);
      return c.json({ error: "Failed to create secret" }, 500);
    }
  }
);

/**
 * GET /api/secrets/:id
 *
 * Get a specific secret (without the value)
 */
secretRoutes.get("/:id", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);
  const secretId = c.req.param("id");

  try {
    const secret = await getSecret(db, secretId, organizationId);

    if (!secret) {
      return c.json({ error: "Secret not found" }, 404);
    }

    const response: GetSecretResponse = { secret };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching secret:", error);
    return c.json({ error: "Failed to fetch secret" }, 500);
  }
});

/**
 * GET /api/secrets/:id/value
 *
 * Get the decrypted value of a secret (use with caution)
 */
secretRoutes.get("/:id/value", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);
  const secretId = c.req.param("id");

  try {
    const value = await getSecretValue(db, secretId, organizationId, c.env);

    if (value === null) {
      return c.json({ error: "Secret not found" }, 404);
    }

    const response: GetSecretValueResponse = { value };
    return c.json(response);
  } catch (error) {
    console.error("Error decrypting secret:", error);
    return c.json({ error: "Failed to decrypt secret" }, 500);
  }
});

/**
 * PUT /api/secrets/:id
 *
 * Update a secret
 */
secretRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      value: z.string().min(1).optional(),
    }) as z.ZodType<UpdateSecretRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);
    const secretId = c.req.param("id");
    const updates = c.req.valid("json");

    // Ensure at least one field is being updated
    if (!updates.name && !updates.value) {
      return c.json({ error: "At least one field must be provided" }, 400);
    }

    try {
      const updatedSecret = await updateSecret(
        db,
        secretId,
        organizationId,
        updates,
        c.env
      );

      if (!updatedSecret) {
        return c.json({ error: "Secret not found" }, 404);
      }

      const response: UpdateSecretResponse = { secret: updatedSecret };
      return c.json(response);
    } catch (error) {
      console.error("Error updating secret:", error);
      return c.json({ error: "Failed to update secret" }, 500);
    }
  }
);

/**
 * DELETE /api/secrets/:id
 *
 * Delete a secret
 */
secretRoutes.delete("/:id", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);
  const secretId = c.req.param("id");

  try {
    const success = await deleteSecret(db, secretId, organizationId);

    const response: DeleteSecretResponse = { success };

    if (success) {
      return c.json(response);
    } else {
      return c.json({ error: "Secret not found" }, 404);
    }
  } catch (error) {
    console.error("Error deleting secret:", error);
    return c.json({ error: "Failed to delete secret" }, 500);
  }
});

export default secretRoutes;
