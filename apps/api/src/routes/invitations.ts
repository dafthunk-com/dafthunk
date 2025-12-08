import type {
  AcceptInvitationResponse,
  DeclineInvitationResponse,
  ListUserInvitationsResponse,
} from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { createDatabase } from "../db";
import {
  acceptInvitation,
  declineInvitation,
  getUserInvitations,
} from "../db/queries";

// Create a new Hono instance for invitation endpoints (user-facing)
const invitationRoutes = new Hono<ApiContext>();

// Apply authentication middleware to all routes
invitationRoutes.use("*", jwtMiddleware);

/**
 * GET /invitations
 *
 * List all pending invitations for the current user
 */
invitationRoutes.get("/", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);

  // Get user's email from JWT or lookup
  const userEmail = jwtPayload.email;
  if (!userEmail) {
    return c.json({ error: "User email not found" }, 400);
  }

  try {
    const invitations = await getUserInvitations(db, userEmail);
    // Cast role and status to the expected types
    const response: ListUserInvitationsResponse = {
      invitations: invitations.map((inv) => ({
        ...inv,
        role: inv.role as "member" | "admin",
        status: inv.status as "pending" | "accepted" | "declined" | "expired",
      })),
    };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching user invitations:", error);
    return c.json({ error: "Failed to fetch invitations" }, 500);
  }
});

/**
 * POST /invitations/:id/accept
 *
 * Accept an invitation
 */
invitationRoutes.post("/:id/accept", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);
  const invitationId = c.req.param("id");

  try {
    const membership = await acceptInvitation(db, invitationId, jwtPayload.sub);

    if (!membership) {
      return c.json(
        {
          error:
            "Invitation not found, expired, or email does not match your account",
        },
        403
      );
    }

    const response: AcceptInvitationResponse = { membership };
    return c.json(response);
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return c.json({ error: "Failed to accept invitation" }, 500);
  }
});

/**
 * POST /invitations/:id/decline
 *
 * Decline an invitation
 */
invitationRoutes.post("/:id/decline", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);
  const invitationId = c.req.param("id");

  try {
    const success = await declineInvitation(db, invitationId, jwtPayload.sub);

    const response: DeclineInvitationResponse = { success };

    if (success) {
      return c.json(response);
    } else {
      return c.json(
        {
          error:
            "Invitation not found, already processed, or email does not match your account",
        },
        403
      );
    }
  } catch (error) {
    console.error("Error declining invitation:", error);
    return c.json({ error: "Failed to decline invitation" }, 500);
  }
});

export default invitationRoutes;
