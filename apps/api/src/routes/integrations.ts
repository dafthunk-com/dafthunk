import {
  CreateIntegrationRequest,
  CreateIntegrationResponse,
  DeleteIntegrationResponse,
  GetIntegrationResponse,
  ListIntegrationsResponse,
  UpdateIntegrationRequest,
  UpdateIntegrationResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase } from "../db";
import {
  createIntegration,
  deleteIntegration,
  getIntegration,
  getIntegrations,
  updateIntegration,
} from "../db";

// Create a new Hono instance for integration endpoints
const integrationRoutes = new Hono<ApiContext>();

// Apply authentication middleware to all routes
integrationRoutes.use("*", jwtMiddleware);

/**
 * GET /api/integrations
 *
 * List all integrations for the current organization
 */
integrationRoutes.get("/", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);

  try {
    const integrations = await getIntegrations(db, organizationId);
    const response: ListIntegrationsResponse = {
      integrations: integrations.map((i) => ({
        ...i,
        tokenExpiresAt: i.tokenExpiresAt || undefined,
        metadata: i.metadata || undefined,
      })),
    };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return c.json({ error: "Failed to fetch integrations" }, 500);
  }
});

/**
 * POST /api/integrations
 *
 * Create a new integration for the current organization
 */
integrationRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Integration name is required"),
      provider: z.enum(["google-mail", "google-calendar", "discord", "openai"]),
      token: z.string().min(1, "Token is required"),
      refreshToken: z.string().optional(),
      tokenExpiresAt: z.coerce.date().optional(),
      metadata: z.string().optional(),
    }) as z.ZodType<CreateIntegrationRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);
    const { name, provider, token, refreshToken, tokenExpiresAt, metadata } =
      c.req.valid("json");

    try {
      const result = await createIntegration(
        db,
        organizationId,
        name,
        provider,
        token,
        refreshToken,
        tokenExpiresAt,
        metadata,
        c.env
      );

      const response: CreateIntegrationResponse = {
        integration: {
          id: result.integration.id,
          name: result.integration.name,
          provider: result.integration.provider as any,
          tokenExpiresAt: result.integration.tokenExpiresAt || undefined,
          metadata: result.integration.metadata || undefined,
          createdAt: result.integration.createdAt,
          updatedAt: result.integration.updatedAt,
        },
      };
      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating integration:", error);
      return c.json({ error: "Failed to create integration" }, 500);
    }
  }
);

/**
 * GET /api/integrations/:id
 *
 * Get a specific integration (without the token)
 */
integrationRoutes.get("/:id", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);
  const integrationId = c.req.param("id");

  try {
    const integration = await getIntegration(db, integrationId, organizationId);

    if (!integration) {
      return c.json({ error: "Integration not found" }, 404);
    }

    const response: GetIntegrationResponse = {
      integration: integration as any,
    };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching integration:", error);
    return c.json({ error: "Failed to fetch integration" }, 500);
  }
});

/**
 * PUT /api/integrations/:id
 *
 * Update an integration
 */
integrationRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      token: z.string().min(1).optional(),
      refreshToken: z.string().optional(),
      tokenExpiresAt: z.coerce.date().optional(),
      metadata: z.string().optional(),
    }) as z.ZodType<UpdateIntegrationRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);
    const integrationId = c.req.param("id");
    const updates = c.req.valid("json");

    // Ensure at least one field is being updated
    if (
      !updates.name &&
      !updates.token &&
      !updates.refreshToken &&
      !updates.tokenExpiresAt &&
      !updates.metadata
    ) {
      return c.json({ error: "At least one field must be provided" }, 400);
    }

    try {
      const updatedIntegration = await updateIntegration(
        db,
        integrationId,
        organizationId,
        updates,
        c.env
      );

      if (!updatedIntegration) {
        return c.json({ error: "Integration not found" }, 404);
      }

      const response: UpdateIntegrationResponse = {
        integration: updatedIntegration as any,
      };
      return c.json(response);
    } catch (error) {
      console.error("Error updating integration:", error);
      return c.json({ error: "Failed to update integration" }, 500);
    }
  }
);

/**
 * DELETE /api/integrations/:id
 *
 * Delete an integration
 */
integrationRoutes.delete("/:id", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);
  const integrationId = c.req.param("id");

  try {
    const success = await deleteIntegration(db, integrationId, organizationId);

    const response: DeleteIntegrationResponse = { success };

    if (success) {
      return c.json(response);
    } else {
      return c.json({ error: "Integration not found" }, 404);
    }
  } catch (error) {
    console.error("Error deleting integration:", error);
    return c.json({ error: "Failed to delete integration" }, 500);
  }
});

export default integrationRoutes;
