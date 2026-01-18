import { count, gte, sql } from "drizzle-orm";
import { Hono } from "hono";

import { ApiContext } from "../../context";
import {
  createDatabase,
  deployments,
  memberships,
  organizations,
  users,
  workflows,
} from "../../db";

const adminStatsRoutes = new Hono<ApiContext>();

/**
 * GET /admin/stats
 *
 * Get platform-wide statistics for the admin dashboard
 */
adminStatsRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);

  try {
    // Get current date info for time-based queries
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Run all count queries in parallel
    const [
      totalUsersResult,
      totalOrganizationsResult,
      totalWorkflowsResult,
      totalDeploymentsResult,
      recentSignupsResult,
      activeUsersResult,
    ] = await Promise.all([
      // Total users
      db
        .select({ count: count() })
        .from(users),
      // Total organizations
      db
        .select({ count: count() })
        .from(organizations),
      // Total workflows
      db
        .select({ count: count() })
        .from(workflows),
      // Total deployments
      db
        .select({ count: count() })
        .from(deployments),
      // Recent signups (last 7 days)
      db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, sevenDaysAgo)),
      // Active users (users who are members of orgs with workflows updated in last 24h)
      db
        .select({ count: sql<number>`COUNT(DISTINCT ${memberships.userId})` })
        .from(memberships)
        .innerJoin(
          workflows,
          sql`${memberships.organizationId} = ${workflows.organizationId}`
        )
        .where(gte(workflows.updatedAt, oneDayAgo)),
    ]);

    return c.json({
      totalUsers: totalUsersResult[0]?.count ?? 0,
      totalOrganizations: totalOrganizationsResult[0]?.count ?? 0,
      totalWorkflows: totalWorkflowsResult[0]?.count ?? 0,
      totalDeployments: totalDeploymentsResult[0]?.count ?? 0,
      recentSignups: recentSignupsResult[0]?.count ?? 0,
      activeUsers24h: activeUsersResult[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return c.json({ error: "Failed to fetch admin stats" }, 500);
  }
});

export default adminStatsRoutes;
