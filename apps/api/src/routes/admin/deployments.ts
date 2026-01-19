import { zValidator } from "@hono/zod-validator";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import {
  createDatabase,
  deployments,
  organizations,
  workflows,
} from "../../db";
import { DeploymentStore } from "../../stores/deployment-store";

const adminDeploymentsRoutes = new Hono<ApiContext>();

/**
 * GET /admin/deployments
 *
 * List all deployments across all organizations with pagination and optional filters
 */
adminDeploymentsRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      search: z.string().optional(),
      organizationId: z.string().optional(),
      workflowId: z.string().optional(),
    })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const { page, limit, search, organizationId, workflowId } =
      c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      // Build where conditions
      const conditions = [];

      if (search) {
        conditions.push(
          or(
            like(workflows.name, `%${search}%`),
            like(workflows.handle, `%${search}%`)
          )
        );
      }

      if (organizationId) {
        conditions.push(eq(deployments.organizationId, organizationId));
      }

      if (workflowId) {
        conditions.push(eq(deployments.workflowId, workflowId));
      }

      const whereClause =
        conditions.length > 0
          ? sql`${sql.join(conditions, sql` AND `)}`
          : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(deployments)
        .leftJoin(workflows, eq(deployments.workflowId, workflows.id))
        .where(whereClause);

      // Get paginated deployments with workflow and organization info
      const deploymentsList = await db
        .select({
          id: deployments.id,
          version: deployments.version,
          organizationId: deployments.organizationId,
          organizationName: organizations.name,
          organizationHandle: organizations.handle,
          workflowId: deployments.workflowId,
          workflowName: workflows.name,
          workflowHandle: workflows.handle,
          isActive: sql<boolean>`${deployments.id} = ${workflows.activeDeploymentId}`,
          createdAt: deployments.createdAt,
          updatedAt: deployments.updatedAt,
        })
        .from(deployments)
        .innerJoin(
          organizations,
          eq(deployments.organizationId, organizations.id)
        )
        .leftJoin(workflows, eq(deployments.workflowId, workflows.id))
        .where(whereClause)
        .orderBy(desc(deployments.createdAt))
        .limit(limit)
        .offset(offset);

      return c.json({
        deployments: deploymentsList,
        pagination: {
          page,
          limit,
          total: countResult?.count ?? 0,
          totalPages: Math.ceil((countResult?.count ?? 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin deployments:", error);
      return c.json({ error: "Failed to fetch deployments" }, 500);
    }
  }
);

/**
 * GET /admin/deployments/:id/structure
 *
 * Get deployment structure (nodes/edges) for admin view
 */
adminDeploymentsRoutes.get(
  "/:id/structure",
  zValidator(
    "query",
    z.object({
      organizationId: z.string(),
    })
  ),
  async (c) => {
    const deploymentId = c.req.param("id");
    const { organizationId } = c.req.valid("query");

    try {
      const deploymentStore = new DeploymentStore(c.env);
      const deployment = await deploymentStore.getWithData(
        deploymentId,
        organizationId
      );

      if (!deployment) {
        return c.json({ error: "Deployment not found" }, 404);
      }

      return c.json({
        id: deployment.id,
        version: deployment.version,
        workflowId: deployment.workflowId,
        nodes: deployment.workflowData.nodes || [],
        edges: deployment.workflowData.edges || [],
      });
    } catch (error) {
      console.error("Error fetching admin deployment structure:", error);
      return c.json({ error: "Failed to fetch deployment structure" }, 500);
    }
  }
);

export default adminDeploymentsRoutes;
