import {
  AddOrUpdateMembershipRequest,
  AddOrUpdateMembershipResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  DeleteMembershipRequest,
  DeleteMembershipResponse,
  DeleteOrganizationResponse,
  ListMembershipsResponse,
  ListOrganizationsResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase } from "../db";
import {
  addOrUpdateMembership,
  createOrganization,
  deleteMembership,
  deleteOrganization,
  getOrganizationMemberships,
  getUserOrganizations,
} from "../db/queries";

// Create a new Hono instance for organization endpoints
const organizationRoutes = new Hono<ApiContext>();

// Apply authentication middleware to all routes
organizationRoutes.use("*", jwtMiddleware);

/**
 * GET /api/organizations
 *
 * List all organizations for the current user
 */
organizationRoutes.get("/", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);

  try {
    const organizations = await getUserOrganizations(db, jwtPayload.sub);
    const response: ListOrganizationsResponse = { organizations };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return c.json({ error: "Failed to fetch organizations" }, 500);
  }
});

/**
 * POST /api/organizations
 *
 * Create a new organization and make the creator the owner
 */
organizationRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Organization name is required"),
    }) as z.ZodType<CreateOrganizationRequest>
  ),
  async (c) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = createDatabase(c.env.DB);
    const { name } = c.req.valid("json");

    try {
      const result = await createOrganization(db, name, jwtPayload.sub);

      const response: CreateOrganizationResponse = {
        organization: {
          id: result.organization.id!,
          name: result.organization.name,
          handle: result.organization.handle,
          computeCredits: result.organization.computeCredits!,
          createdAt: result.organization.createdAt!,
          updatedAt: result.organization.updatedAt!,
        },
        membership: {
          userId: result.membership.userId,
          organizationId: result.membership.organizationId,
          role: result.membership.role as "owner",
          createdAt: result.membership.createdAt!,
          updatedAt: result.membership.updatedAt!,
        },
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating organization:", error);
      return c.json({ error: "Failed to create organization" }, 500);
    }
  }
);

/**
 * DELETE /api/organizations/:id
 *
 * Delete an organization (only owners can delete)
 */
organizationRoutes.delete("/:id", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);
  const organizationIdOrHandle = c.req.param("id");

  try {
    const success = await deleteOrganization(
      db,
      organizationIdOrHandle,
      jwtPayload.sub
    );

    const response: DeleteOrganizationResponse = { success };

    if (success) {
      return c.json(response);
    } else {
      return c.json(
        { error: "Organization not found or permission denied" },
        404
      );
    }
  } catch (error) {
    console.error("Error deleting organization:", error);
    return c.json({ error: "Failed to delete organization" }, 500);
  }
});

/**
 * GET /api/organizations/:id/memberships
 *
 * List all memberships for an organization
 */
organizationRoutes.get("/:id/memberships", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);
  const organizationIdOrHandle = c.req.param("id");

  try {
    const memberships = await getOrganizationMemberships(
      db,
      organizationIdOrHandle
    );
    const response: ListMembershipsResponse = { memberships };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching memberships:", error);
    return c.json({ error: "Failed to fetch memberships" }, 500);
  }
});

/**
 * POST /api/organizations/:id/memberships
 *
 * Add or update a user's membership in an organization
 */
organizationRoutes.post(
  "/:id/memberships",
  zValidator(
    "json",
    z.object({
      userId: z.string().min(1, "User ID is required"),
      role: z.enum(["member", "admin", "owner"], {
        errorMap: () => ({ message: "Role must be member, admin, or owner" }),
      }),
    }) as z.ZodType<AddOrUpdateMembershipRequest>
  ),
  async (c) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = createDatabase(c.env.DB);
    const organizationIdOrHandle = c.req.param("id");
    const { userId, role } = c.req.valid("json");

    try {
      const membership = await addOrUpdateMembership(
        db,
        organizationIdOrHandle,
        userId,
        role,
        jwtPayload.sub
      );

      if (!membership) {
        return c.json(
          { error: "Permission denied or organization not found" },
          403
        );
      }

      const response: AddOrUpdateMembershipResponse = {
        membership: {
          userId: membership.userId,
          organizationId: membership.organizationId,
          role: membership.role,
          createdAt: membership.createdAt,
          updatedAt: membership.updatedAt,
        },
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error adding/updating membership:", error);
      return c.json({ error: "Failed to add/update membership" }, 500);
    }
  }
);

/**
 * DELETE /api/organizations/:id/memberships
 *
 * Delete a user's membership from an organization
 */
organizationRoutes.delete(
  "/:id/memberships",
  zValidator(
    "json",
    z.object({
      userId: z.string().min(1, "User ID is required"),
    }) as z.ZodType<DeleteMembershipRequest>
  ),
  async (c) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = createDatabase(c.env.DB);
    const organizationIdOrHandle = c.req.param("id");
    const { userId } = c.req.valid("json");

    try {
      const success = await deleteMembership(
        db,
        organizationIdOrHandle,
        userId,
        jwtPayload.sub
      );

      const response: DeleteMembershipResponse = { success };

      if (success) {
        return c.json(response);
      } else {
        return c.json(
          { error: "Membership not found or permission denied" },
          404
        );
      }
    } catch (error) {
      console.error("Error deleting membership:", error);
      return c.json({ error: "Failed to delete membership" }, 500);
    }
  }
);

export default organizationRoutes;
