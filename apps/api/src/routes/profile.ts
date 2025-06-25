import {
  GetProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase, users } from "../db";

const profile = new Hono<ApiContext>();

// Apply authentication middleware to all routes
profile.use("*", jwtMiddleware);

/**
 * GET /auth/profile
 *
 * Get current user's profile
 */
profile.get("/", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = createDatabase(c.env.DB);

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, jwtPayload.sub));
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const response: GetProfileResponse = {
      id: user.id,
      name: user.name,
      email: user.email || undefined,
      githubId: user.githubId || undefined,
      googleId: user.googleId || undefined,
      avatarUrl: user.avatarUrl || undefined,
      organizationId: user.organizationId,
      plan: user.plan,
      role: user.role,
      developerMode: user.developerMode,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

/**
 * PATCH /auth/profile
 *
 * Update developerMode only
 */
profile.patch(
  "/",
  zValidator(
    "json",
    z.object({
      developerMode: z.boolean(),
    }) as z.ZodType<UpdateProfileRequest>
  ),
  async (c) => {
    const jwtPayload = c.get("jwtPayload");
    if (!jwtPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = createDatabase(c.env.DB);
    const { developerMode } = c.req.valid("json");

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, jwtPayload.sub));
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      await db
        .update(users)
        .set({ developerMode })
        .where(eq(users.id, jwtPayload.sub));

      const response: UpdateProfileResponse = {
        success: true,
        developerMode,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error updating profile:", error);
      return c.json({ error: "Failed to update profile" }, 500);
    }
  }
);

export default profile;
