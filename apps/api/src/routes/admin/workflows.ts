import { zValidator } from "@hono/zod-validator";
import { count, desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import {
  createDatabase,
  deployments,
  organizations,
  workflows,
} from "../../db";
import { WorkflowStore } from "../../stores/workflow-store";

const adminWorkflowsRoutes = new Hono<ApiContext>();

/**
 * GET /admin/workflows
 *
 * List all workflows across all organizations with pagination and optional search
 */
adminWorkflowsRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      search: z.string().optional(),
      organizationId: z.string().optional(),
    })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const { page, limit, search, organizationId } = c.req.valid("query");
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
        conditions.push(eq(workflows.organizationId, organizationId));
      }

      const whereClause =
        conditions.length > 0
          ? sql`${sql.join(conditions, sql` AND `)}`
          : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(workflows)
        .where(whereClause);

      // Get paginated workflows with organization info
      const workflowsList = await db
        .select({
          id: workflows.id,
          name: workflows.name,
          handle: workflows.handle,
          description: workflows.description,
          trigger: workflows.trigger,
          runtime: workflows.runtime,
          organizationId: workflows.organizationId,
          organizationName: organizations.name,
          organizationHandle: organizations.handle,
          activeDeploymentId: workflows.activeDeploymentId,
          createdAt: workflows.createdAt,
          updatedAt: workflows.updatedAt,
        })
        .from(workflows)
        .innerJoin(
          organizations,
          eq(workflows.organizationId, organizations.id)
        )
        .where(whereClause)
        .orderBy(desc(workflows.updatedAt))
        .limit(limit)
        .offset(offset);

      return c.json({
        workflows: workflowsList,
        pagination: {
          page,
          limit,
          total: countResult?.count ?? 0,
          totalPages: Math.ceil((countResult?.count ?? 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin workflows:", error);
      return c.json({ error: "Failed to fetch workflows" }, 500);
    }
  }
);

/**
 * GET /admin/workflows/:id
 *
 * Get details for a specific workflow
 */
adminWorkflowsRoutes.get("/:id", async (c) => {
  const db = createDatabase(c.env.DB);
  const workflowId = c.req.param("id");

  try {
    // Get workflow details with organization info
    const [workflow] = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        handle: workflows.handle,
        description: workflows.description,
        trigger: workflows.trigger,
        runtime: workflows.runtime,
        organizationId: workflows.organizationId,
        organizationName: organizations.name,
        organizationHandle: organizations.handle,
        activeDeploymentId: workflows.activeDeploymentId,
        createdAt: workflows.createdAt,
        updatedAt: workflows.updatedAt,
      })
      .from(workflows)
      .innerJoin(organizations, eq(workflows.organizationId, organizations.id))
      .where(eq(workflows.id, workflowId));

    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    // Get deployment count
    const [deploymentCountResult] = await db
      .select({ count: count() })
      .from(deployments)
      .where(eq(deployments.workflowId, workflowId));

    return c.json({
      workflow,
      stats: {
        deploymentCount: deploymentCountResult?.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Error fetching admin workflow detail:", error);
    return c.json({ error: "Failed to fetch workflow" }, 500);
  }
});

/**
 * GET /admin/workflows/:id/structure
 *
 * Get workflow structure (nodes/edges) for admin view
 */
adminWorkflowsRoutes.get(
  "/:id/structure",
  zValidator(
    "query",
    z.object({
      organizationId: z.string(),
    })
  ),
  async (c) => {
    const workflowId = c.req.param("id");
    const { organizationId } = c.req.valid("query");

    try {
      const workflowStore = new WorkflowStore(c.env);
      const workflow = await workflowStore.getWithData(
        workflowId,
        organizationId
      );

      if (!workflow) {
        return c.json({ error: "Workflow not found" }, 404);
      }

      return c.json({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        handle: workflow.handle,
        trigger: workflow.trigger,
        runtime: workflow.runtime,
        nodes: workflow.data.nodes || [],
        edges: workflow.data.edges || [],
      });
    } catch (error) {
      console.error("Error fetching admin workflow structure:", error);
      return c.json({ error: "Failed to fetch workflow structure" }, 500);
    }
  }
);

export default adminWorkflowsRoutes;
