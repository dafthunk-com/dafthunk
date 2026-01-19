import type {
  AddMembershipRequest,
  AddMembershipResponse,
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  DeleteInvitationResponse,
  DeleteOrganizationResponse,
  GetOrganizationSettingsResponse,
  ListInvitationsResponse,
  ListMembershipsResponse,
  ListOrganizationsResponse,
  RemoveMembershipRequest,
  RemoveMembershipResponse,
  UpdateMembershipRequest,
  UpdateMembershipResponse,
  UpdateOrganizationSettingsRequest,
  UpdateOrganizationSettingsResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase } from "../db";
import {
  addOrUpdateMembership,
  createInvitation,
  createOrganization,
  deleteInvitation,
  deleteMembership,
  deleteOrganization,
  getOrganization,
  getOrganizationInvitations,
  getOrganizationMembershipsWithUsers,
  getOrganizationSettings,
  getUserOrganizations,
  updateOrganizationSettings,
} from "../db/queries";
import { createEmailService } from "../services/email-service";
import { getInvitationEmail } from "../services/email-templates";

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
      email: z.email(),
      role: z.enum(["member", "admin"], {
        error: "Role must be member or admin",
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
      email: z.email(),
      role: z.enum(["member", "admin"], {
        error: "Role must be member or admin",
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
      email: z.email(),
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

/**
 * GET /api/organizations/:id/invitations
 *
 * List all pending invitations for an organization
 */
organizationRoutes.get("/:id/invitations", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);
  const organizationIdOrHandle = c.req.param("id");

  try {
    const invitations = await getOrganizationInvitations(
      db,
      organizationIdOrHandle
    );
    // Cast role to the expected type (invitations can only have member or admin roles)
    const response: ListInvitationsResponse = {
      invitations: invitations.map((inv) => ({
        ...inv,
        role: inv.role as "member" | "admin",
        status: inv.status as "pending" | "accepted" | "declined" | "expired",
      })),
    };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return c.json({ error: "Failed to fetch invitations" }, 500);
  }
});

/**
 * POST /api/organizations/:id/invitations
 *
 * Create an invitation to join an organization
 */
organizationRoutes.post(
  "/:id/invitations",
  zValidator(
    "json",
    z.object({
      email: z.string().email("Valid email is required"),
      role: z.enum(["member", "admin"], {
        error: "Role must be member or admin",
      }),
    }) as z.ZodType<CreateInvitationRequest>
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
      const invitation = await createInvitation(
        db,
        organizationIdOrHandle,
        email,
        role,
        jwtPayload.sub
      );

      if (!invitation) {
        return c.json(
          {
            error:
              "Permission denied, user already a member, or invitation already exists",
          },
          403
        );
      }

      // Fetch the inviter info to return complete invitation data
      const invitations = await getOrganizationInvitations(
        db,
        organizationIdOrHandle
      );
      const createdInvitation = invitations.find(
        (inv) => inv.id === invitation.id
      );

      if (!createdInvitation) {
        return c.json({ error: "Failed to retrieve created invitation" }, 500);
      }

      // Send invitation email
      const emailService = createEmailService(c.env);
      if (emailService) {
        const organization = await getOrganization(db, organizationIdOrHandle);
        if (organization) {
          const emailContent = getInvitationEmail({
            inviteeEmail: email,
            organizationName: organization.name,
            inviterName: createdInvitation.inviter.name,
            role: role.charAt(0).toUpperCase() + role.slice(1),
            expiresAt: invitation.expiresAt,
            appUrl: c.env.WEB_HOST,
            websiteUrl: c.env.WEBSITE_URL,
          });

          const emailResult = await emailService.send({
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          if (!emailResult.success) {
            console.warn("Failed to send invitation email:", emailResult.error);
            // Note: We don't fail the request if email fails
            // The invitation is still created
          }
        }
      }

      const response: CreateInvitationResponse = {
        invitation: {
          ...createdInvitation,
          role: createdInvitation.role as "member" | "admin",
          status: createdInvitation.status as
            | "pending"
            | "accepted"
            | "declined"
            | "expired",
        },
      };
      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating invitation:", error);
      return c.json({ error: "Failed to create invitation" }, 500);
    }
  }
);

/**
 * DELETE /api/organizations/:id/invitations/:invitationId
 *
 * Cancel/delete an invitation
 */
organizationRoutes.delete("/:id/invitations/:invitationId", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);
  const organizationIdOrHandle = c.req.param("id");
  const invitationId = c.req.param("invitationId");

  try {
    const success = await deleteInvitation(
      db,
      invitationId,
      organizationIdOrHandle,
      jwtPayload.sub
    );

    const response: DeleteInvitationResponse = { success };

    if (success) {
      return c.json(response);
    } else {
      return c.json(
        { error: "Permission denied or invitation not found" },
        403
      );
    }
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return c.json({ error: "Failed to delete invitation" }, 500);
  }
});

/**
 * GET /api/organizations/:id/settings
 *
 * Get organization settings
 */
organizationRoutes.get("/:id/settings", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);
  const organizationIdOrHandle = c.req.param("id");

  try {
    const settings = await getOrganizationSettings(db, organizationIdOrHandle);

    if (!settings) {
      return c.json({ error: "Organization not found" }, 404);
    }

    const response: GetOrganizationSettingsResponse = {
      settings: {
        mcpEnabled: settings.mcpEnabled,
      },
    };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching organization settings:", error);
    return c.json({ error: "Failed to fetch organization settings" }, 500);
  }
});

/**
 * PATCH /api/organizations/:id/settings
 *
 * Update organization settings
 */
organizationRoutes.patch(
  "/:id/settings",
  zValidator(
    "json",
    z.object({
      mcpEnabled: z.boolean().optional(),
    }) as z.ZodType<UpdateOrganizationSettingsRequest>
  ),
  async (c) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = createDatabase(c.env.DB);
    const organizationIdOrHandle = c.req.param("id");
    const updates = c.req.valid("json");

    try {
      const settings = await updateOrganizationSettings(
        db,
        organizationIdOrHandle,
        updates
      );

      if (!settings) {
        return c.json({ error: "Organization not found" }, 404);
      }

      const response: UpdateOrganizationSettingsResponse = {
        settings: {
          mcpEnabled: settings.mcpEnabled,
        },
      };
      return c.json(response);
    } catch (error) {
      console.error("Error updating organization settings:", error);
      return c.json({ error: "Failed to update organization settings" }, 500);
    }
  }
);

export default organizationRoutes;
