import {
  AddMembershipRequest,
  AddMembershipResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  DeleteOrganizationResponse,
  ListMembershipsResponse,
  ListOrganizationsResponse,
  RemoveMembershipRequest,
  RemoveMembershipResponse,
  UpdateMembershipRequest,
  UpdateMembershipResponse,
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
  getOrganizationMembershipsWithUsers,
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
          createdAt: result.organization.createdAt!,
          updatedAt: result.organization.updatedAt!,
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
    const memberships = await getOrganizationMembershipsWithUsers(
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
 * Add a user to an organization or update their role
 */
organizationRoutes.post(
  "/:id/memberships",
  zValidator(
    "json",
    z.object({
      email: z.string().email("Valid email is required"),
      role: z.enum(["member", "admin", "owner"], {
        errorMap: () => ({ message: "Role must be member, admin, or owner" }),
      }),
    }) as z.ZodType<Omit<AddMembershipRequest, "organizationId">>
  ),
  async (c) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = createDatabase(c.env.DB);
    const organizationIdOrHandle = c.req.param("id");
    const { email, role } = c.req.valid("json");

    try {
      const membership = await addOrUpdateMembership(
        db,
        organizationIdOrHandle,
        email,
        role,
        jwtPayload.sub
      );

      if (!membership) {
        return c.json({ error: "Permission denied or user not found" }, 403);
      }

      const response: AddMembershipResponse = { membership };
      return c.json(response, 201);
    } catch (error) {
      console.error("Error adding/updating membership:", error);
      return c.json({ error: "Failed to add/update membership" }, 500);
    }
  }
);

/**
 * PUT /api/organizations/:id/memberships
 *
 * Update a user's role in an organization
 */
organizationRoutes.put(
  "/:id/memberships",
  zValidator(
    "json",
    z.object({
      email: z.string().email("Valid email is required"),
      role: z.enum(["member", "admin", "owner"], {
        errorMap: () => ({ message: "Role must be member, admin, or owner" }),
      }),
    }) as z.ZodType<Omit<UpdateMembershipRequest, "organizationId">>
  ),
  async (c) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = createDatabase(c.env.DB);
    const organizationIdOrHandle = c.req.param("id");
    const { email, role } = c.req.valid("json");

    try {
      const membership = await addOrUpdateMembership(
        db,
        organizationIdOrHandle,
        email,
        role,
        jwtPayload.sub
      );

      if (!membership) {
        return c.json({ error: "Permission denied or user not found" }, 403);
      }

      const response: UpdateMembershipResponse = { membership };
      return c.json(response);
    } catch (error) {
      console.error("Error updating membership:", error);
      return c.json({ error: "Failed to update membership" }, 500);
    }
  }
);

/**
 * DELETE /api/organizations/:id/memberships
 *
 * Remove a user from an organization
 */
organizationRoutes.delete(
  "/:id/memberships",
  zValidator(
    "json",
    z.object({
      email: z.string().email("Valid email is required"),
    }) as z.ZodType<Omit<RemoveMembershipRequest, "organizationId">>
  ),
  async (c) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = createDatabase(c.env.DB);
    const organizationIdOrHandle = c.req.param("id");
    const { email } = c.req.valid("json");

    try {
      const success = await deleteMembership(
        db,
        organizationIdOrHandle,
        email,
        jwtPayload.sub
      );

      const response: RemoveMembershipResponse = { success };

      if (success) {
        return c.json(response);
      } else {
        return c.json(
          { error: "Permission denied or membership not found" },
          403
        );
      }
    } catch (error) {
      console.error("Error removing membership:", error);
      return c.json({ error: "Failed to remove membership" }, 500);
    }
  }
);

export default organizationRoutes;
