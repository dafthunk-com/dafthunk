import { zValidator } from "@hono/zod-validator";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import { createDatabase, memberships, organizations, users } from "../../db";

const adminUsersRoutes = new Hono<ApiContext>();

/**
 * GET /admin/users
 *
 * List all users with pagination and optional search
 */
adminUsersRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      search: z.string().optional(),
    })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const { page, limit, search } = c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      // Build where clause for search
      const whereClause = search
        ? or(like(users.name, `%${search}%`), like(users.email, `%${search}%`))
        : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(whereClause);

      // Get paginated users
      const usersList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
          plan: users.plan,
          role: users.role,
          developerMode: users.developerMode,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return c.json({
        users: usersList,
        pagination: {
          page,
          limit,
          total: countResult?.count ?? 0,
          totalPages: Math.ceil((countResult?.count ?? 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin users:", error);
      return c.json({ error: "Failed to fetch users" }, 500);
    }
  }
);

/**
 * GET /admin/users/:id
 *
 * Get details for a specific user including their organization memberships
 */
adminUsersRoutes.get("/:id", async (c) => {
  const db = createDatabase(c.env.DB);
  const userId = c.req.param("id");

  try {
    // Get user details
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get user's organization memberships
    const userMemberships = await db
      .select({
        organizationId: memberships.organizationId,
        organizationName: organizations.name,
        organizationHandle: organizations.handle,
        role: memberships.role,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(
        organizations,
        eq(memberships.organizationId, organizations.id)
      )
      .where(eq(memberships.userId, userId));

    return c.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        githubId: user.githubId,
        googleId: user.googleId,
        plan: user.plan,
        role: user.role,
        developerMode: user.developerMode,
        tourCompleted: user.tourCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      memberships: userMemberships,
    });
  } catch (error) {
    console.error("Error fetching admin user detail:", error);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

export default adminUsersRoutes;
