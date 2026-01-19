import type { ExecutionStatusType } from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import { createDatabase, organizations, workflows } from "../../db";
import { ExecutionStore } from "../../stores/execution-store";

const adminExecutionsRoutes = new Hono<ApiContext>();

/**
 * Sanitize a string value for use in Analytics Engine SQL queries.
 * Escapes single quotes and validates the format to prevent SQL injection.
 */
function sanitizeForAnalyticsEngine(value: string): string {
  // Only allow alphanumeric characters, hyphens, and underscores (typical ID formats)
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid value format: ${value}`);
  }
  return value;
}

/**
 * GET /admin/executions
 *
 * List executions across all organizations with pagination and filters
 * Uses Analytics Engine for querying
 */
adminExecutionsRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      organizationId: z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
      workflowId: z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
      status: z.enum(["running", "completed", "error", "cancelled"]).optional(),
    })
  ),
  async (c) => {
    const { page, limit, organizationId, workflowId, status } =
      c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      // Build Analytics Engine query
      const env = c.env.CLOUDFLARE_ENV || "development";
      const dataset =
        env === "production"
          ? "dafthunk_executions_production"
          : "dafthunk_executions_development";

      const whereConditions: string[] = [];

      // Values are already validated by Zod regex, but we sanitize as defense in depth
      if (organizationId) {
        whereConditions.push(
          `index1 = '${sanitizeForAnalyticsEngine(organizationId)}'`
        );
      }

      if (workflowId) {
        whereConditions.push(
          `blob2 = '${sanitizeForAnalyticsEngine(workflowId)}'`
        );
      }

      if (status) {
        // Status is validated by Zod enum, safe to use directly
        whereConditions.push(`blob4 = '${status}'`);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Query Analytics Engine
      const sql = `
        SELECT *
        FROM ${dataset}
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      // Validate required credentials
      if (!c.env.CLOUDFLARE_ACCOUNT_ID || !c.env.CLOUDFLARE_API_TOKEN) {
        return c.json({
          error: "Analytics Engine credentials not configured",
          executions: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }

      const url = `https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.CLOUDFLARE_API_TOKEN}`,
        },
        body: sql,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(
          `Admin executions query failed: ${response.status} - ${error}`
        );
        return c.json({
          error: "Failed to query executions",
          executions: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }

      const result = (await response.json()) as { data?: any[] };
      const rows = result.data || [];

      // Get organization and workflow names for the results
      const db = createDatabase(c.env.DB);
      const orgIds = [...new Set(rows.map((r) => r.index1))];
      const workflowIds = [...new Set(rows.map((r) => r.blob2))];

      // Fetch organization names
      const orgsMap = new Map<string, string>();
      if (orgIds.length > 0) {
        const orgs = await db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations);
        orgs.forEach((o) => orgsMap.set(o.id, o.name));
      }

      // Fetch workflow names
      const workflowsMap = new Map<string, string>();
      if (workflowIds.length > 0) {
        const wfs = await db
          .select({ id: workflows.id, name: workflows.name })
          .from(workflows);
        wfs.forEach((w) => workflowsMap.set(w.id, w.name));
      }

      const executions = rows.map((row) => {
        const timestamp = new Date(row.timestamp);
        const startedAt = row.double2 ? new Date(row.double2) : timestamp;
        const endedAt = row.double3 ? new Date(row.double3) : timestamp;

        return {
          id: row.blob1,
          workflowId: row.blob2,
          workflowName: workflowsMap.get(row.blob2) || "Unknown Workflow",
          deploymentId: row.blob3 || undefined,
          organizationId: row.index1,
          organizationName: orgsMap.get(row.index1) || "Unknown Organization",
          status: row.blob4 as ExecutionStatusType,
          error: row.blob5 || undefined,
          startedAt,
          endedAt,
          usage: row.double4 ?? 0,
        };
      });

      return c.json({
        executions,
        pagination: {
          page,
          limit,
          total: executions.length, // Note: Analytics Engine doesn't easily give us total count
          totalPages: 1, // Would need a separate count query
        },
      });
    } catch (error) {
      console.error("Error fetching admin executions:", error);
      return c.json({ error: "Failed to fetch executions" }, 500);
    }
  }
);

/**
 * GET /admin/executions/:id
 *
 * Get details for a specific execution (requires organizationId as query param)
 */
adminExecutionsRoutes.get(
  "/:id",
  zValidator(
    "query",
    z.object({
      organizationId: z.string(),
    })
  ),
  async (c) => {
    const executionId = c.req.param("id");
    const { organizationId } = c.req.valid("query");

    try {
      const executionStore = new ExecutionStore(c.env);
      const execution = await executionStore.getWithData(
        executionId,
        organizationId
      );

      if (!execution) {
        return c.json({ error: "Execution not found" }, 404);
      }

      // Get workflow and org names
      const db = createDatabase(c.env.DB);

      const [workflow] = await db
        .select({ name: workflows.name })
        .from(workflows)
        .where(eq(workflows.id, execution.workflowId));

      const [org] = await db
        .select({ name: organizations.name, handle: organizations.handle })
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      return c.json({
        execution: {
          id: execution.id,
          workflowId: execution.workflowId,
          workflowName: workflow?.name || "Unknown Workflow",
          deploymentId: execution.deploymentId,
          organizationId,
          organizationName: org?.name || "Unknown Organization",
          organizationHandle: org?.handle || "",
          status: execution.status,
          error: execution.error,
          startedAt: execution.startedAt,
          endedAt: execution.endedAt,
          usage: execution.usage,
          nodeExecutions: execution.data.nodeExecutions || [],
        },
      });
    } catch (error) {
      console.error("Error fetching admin execution detail:", error);
      return c.json({ error: "Failed to fetch execution" }, 500);
    }
  }
);

export default adminExecutionsRoutes;
