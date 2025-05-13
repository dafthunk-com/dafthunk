import { Hono } from "hono";
import { ApiContext, CustomJWTPayload } from "../context";
import { getWorkflowsByOrganization } from "../utils/db";
import { getDeploymentsGroupedByWorkflow } from "../utils/db";
import { listExecutions } from "../utils/db";
import { jwtAuth } from "../auth";
import { createDatabase } from "../db";
import { ExecutionStatus } from "../db/schema";
import type { Execution } from "../db/schema";
import { DashboardStats, DashboardStatsResponse } from "@dafthunk/types";

const dashboard = new Hono<ApiContext>();

// Apply authentication middleware to all routes
dashboard.use("*", jwtAuth);

/**
 * GET /:orgHandle/dashboard
 *
 * Get dashboard statistics for the organization
 */
dashboard.get("/", async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const db = createDatabase(c.env.DB);

  try {
    // Workflows count
    const workflows = await getWorkflowsByOrganization(
      db,
      user.organization.id
    );
    const workflowsCount = workflows.length;

    // Deployments count
    const deployments = await getDeploymentsGroupedByWorkflow(
      db,
      user.organization.id
    );
    const deploymentsCount = deployments.reduce(
      (acc: number, w: { deploymentCount: number }) => acc + w.deploymentCount,
      0
    );

    // Executions stats
    const executions: Execution[] = await listExecutions(
      db,
      user.organization.id,
      { limit: 10 }
    ); // limit for perf
    const totalExecutions = executions.length;
    const runningExecutions = executions.filter(
      (e: Execution) => e.status === ExecutionStatus.EXECUTING
    ).length;
    const failedExecutions = executions.filter(
      (e: Execution) => e.status === ExecutionStatus.ERROR
    ).length;
    const completedExecutions = executions.filter(
      (e: Execution) =>
        e.status === ExecutionStatus.COMPLETED && e.startedAt && e.endedAt
    );
    const avgTimeSeconds =
      completedExecutions.length > 0
        ? Math.round(
            completedExecutions.reduce(
              (sum: number, e: Execution) =>
                sum + (Number(e.endedAt) - Number(e.startedAt)) / 1000,
              0
            ) / completedExecutions.length
          )
        : 0;

    // Recent executions (last 10)
    const recentExecutions = executions.slice(0, 10).map((e: Execution) => ({
      id: e.id,
      workflowName: workflows.find((w) => w.id === e.workflowId)?.name || "",
      status: e.status,
      startedAt: e.startedAt ? Number(e.startedAt) : Date.now(),
    }));

    const stats: DashboardStats = {
      workflows: workflowsCount,
      deployments: deploymentsCount,
      executions: {
        total: totalExecutions,
        running: runningExecutions,
        failed: failedExecutions,
        avgTimeSeconds,
      },
      recentExecutions,
    };

    const response: DashboardStatsResponse = { stats };
    return c.json(response);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return c.json({ error: "Failed to fetch dashboard statistics" }, 500);
  }
});

export default dashboard;
