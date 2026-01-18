import { zValidator } from "@hono/zod-validator";
import { count, desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import {
  createDatabase,
  databases,
  datasets,
  deployments,
  emails,
  memberships,
  organizations,
  queues,
  users,
  workflows,
} from "../../db";

const adminOrganizationsRoutes = new Hono<ApiContext>();

/**
 * GET /admin/organizations
 *
 * List all organizations with pagination and optional search
 */
adminOrganizationsRoutes.get(
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
        ? or(
            like(organizations.name, `%${search}%`),
            like(organizations.handle, `%${search}%`)
          )
        : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(organizations)
        .where(whereClause);

      // Get paginated organizations with member count
      const orgsList = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          handle: organizations.handle,
          computeCredits: organizations.computeCredits,
          subscriptionStatus: organizations.subscriptionStatus,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          memberCount: sql<number>`(SELECT COUNT(*) FROM ${memberships} WHERE ${memberships.organizationId} = ${organizations.id})`,
          workflowCount: sql<number>`(SELECT COUNT(*) FROM ${workflows} WHERE ${workflows.organizationId} = ${organizations.id})`,
        })
        .from(organizations)
        .where(whereClause)
        .orderBy(desc(organizations.createdAt))
        .limit(limit)
        .offset(offset);

      return c.json({
        organizations: orgsList,
        pagination: {
          page,
          limit,
          total: countResult?.count ?? 0,
          totalPages: Math.ceil((countResult?.count ?? 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin organizations:", error);
      return c.json({ error: "Failed to fetch organizations" }, 500);
    }
  }
);

/**
 * GET /admin/organizations/:id
 *
 * Get details for a specific organization including members and stats
 */
adminOrganizationsRoutes.get("/:id", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.req.param("id");

  try {
    // Get organization details
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!organization) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Get organization members
    const orgMembers = await db
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userAvatarUrl: users.avatarUrl,
        role: memberships.role,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.organizationId, organizationId));

    // Get workflow count
    const [workflowCountResult] = await db
      .select({ count: count() })
      .from(workflows)
      .where(eq(workflows.organizationId, organizationId));

    return c.json({
      organization: {
        id: organization.id,
        name: organization.name,
        handle: organization.handle,
        computeCredits: organization.computeCredits,
        stripeCustomerId: organization.stripeCustomerId,
        stripeSubscriptionId: organization.stripeSubscriptionId,
        subscriptionStatus: organization.subscriptionStatus,
        currentPeriodStart: organization.currentPeriodStart,
        currentPeriodEnd: organization.currentPeriodEnd,
        overageLimit: organization.overageLimit,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      },
      members: orgMembers,
      stats: {
        workflowCount: workflowCountResult?.count ?? 0,
        memberCount: orgMembers.length,
      },
    });
  } catch (error) {
    console.error("Error fetching admin organization detail:", error);
    return c.json({ error: "Failed to fetch organization" }, 500);
  }
});

/**
 * GET /admin/organizations/:id/entity-counts
 *
 * Get counts of all entities (workflows, deployments, emails, queues, datasets, databases)
 * for a specific organization in a single request
 */
adminOrganizationsRoutes.get("/:id/entity-counts", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.req.param("id");

  try {
    // Verify organization exists
    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!organization) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Run all count queries in parallel
    const [
      workflowCountResult,
      deploymentCountResult,
      emailCountResult,
      queueCountResult,
      datasetCountResult,
      databaseCountResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(workflows)
        .where(eq(workflows.organizationId, organizationId)),
      db
        .select({ count: count() })
        .from(deployments)
        .where(eq(deployments.organizationId, organizationId)),
      db
        .select({ count: count() })
        .from(emails)
        .where(eq(emails.organizationId, organizationId)),
      db
        .select({ count: count() })
        .from(queues)
        .where(eq(queues.organizationId, organizationId)),
      db
        .select({ count: count() })
        .from(datasets)
        .where(eq(datasets.organizationId, organizationId)),
      db
        .select({ count: count() })
        .from(databases)
        .where(eq(databases.organizationId, organizationId)),
    ]);

    return c.json({
      workflowCount: workflowCountResult[0]?.count ?? 0,
      deploymentCount: deploymentCountResult[0]?.count ?? 0,
      emailCount: emailCountResult[0]?.count ?? 0,
      queueCount: queueCountResult[0]?.count ?? 0,
      datasetCount: datasetCountResult[0]?.count ?? 0,
      databaseCount: databaseCountResult[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Error fetching admin organization entity counts:", error);
    return c.json({ error: "Failed to fetch entity counts" }, 500);
  }
});

export default adminOrganizationsRoutes;
