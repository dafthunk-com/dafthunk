import { zValidator } from "@hono/zod-validator";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import {
  createDatabase,
  memberships,
  organizations,
  resolveOrganizationPlan,
  users,
} from "../../db";

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

      // Get paginated users with org billing info to derive plan
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
          subscriptionStatus: organizations.subscriptionStatus,
          currentPeriodEnd: organizations.currentPeriodEnd,
          role: users.role,
          developerMode: users.developerMode,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .innerJoin(organizations, eq(users.organizationId, organizations.id))
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const usersList = rows.map(
        ({ subscriptionStatus, currentPeriodEnd, ...user }) => ({
          ...user,
          plan: resolveOrganizationPlan({
            subscriptionStatus,
            currentPeriodEnd,
          }),
        })
      );

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
    // Get user details with org billing info to derive plan
    const [row] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        githubId: users.githubId,
        googleId: users.googleId,
        subscriptionStatus: organizations.subscriptionStatus,
        currentPeriodEnd: organizations.currentPeriodEnd,
        role: users.role,
        developerMode: users.developerMode,
        tourCompleted: users.tourCompleted,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.id, userId));

    if (!row) {
      return c.json({ error: "User not found" }, 404);
    }

    const { subscriptionStatus, currentPeriodEnd, ...userFields } = row;
    const user = {
      ...userFields,
      plan: resolveOrganizationPlan({ subscriptionStatus, currentPeriodEnd }),
    };

    // Get user's organization memberships
    const userMemberships = await db
      .select({
        organizationId: memberships.organizationId,
        organizationName: organizations.name,
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
      user,
      memberships: userMemberships,
    });
  } catch (error) {
    console.error("Error fetching admin user detail:", error);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

export default adminUsersRoutes;
