import {
  DashboardStats,
  DashboardStatsResponse,
  ExecutionStatus,
} from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import type { ExecutionRow } from "../runtime/execution-store";
import { CloudflareExecutionStore } from "../runtime/execution-store";
import { DeploymentStore } from "../stores/deployment-store";
import { WorkflowStore } from "../stores/workflow-store";

const dashboard = new Hono<ApiContext>();

// Apply authentication middleware to all routes
dashboard.use("*", jwtMiddleware);

/**
 * GET /:organizationIdOrHandle/dashboard
 *
 * Get dashboard statistics for the organization
 */
dashboard.get("/", async (c) => {
  const organizationId = c.get("organizationId")!;

  const executionStore = new CloudflareExecutionStore(c.env);
  const workflowStore = new WorkflowStore(c.env);
  const deploymentStore = new DeploymentStore(c.env);

  try {
    // Workflows count
    const workflows = await workflowStore.list(organizationId);
    const workflowsCount = workflows.length;

    // Deployments count
    const deployments =
      await deploymentStore.getGroupedByWorkflow(organizationId);
    const deploymentsCount = deployments.reduce(
      (acc: number, w: { deploymentCount: number }) => acc + w.deploymentCount,
      0
    );

    // Executions stats
    const executions: ExecutionRow[] = await executionStore.list(
      organizationId,
      {
        limit: 10,
      }
    ); // limit for perf
    const totalExecutions = executions.length;
    const runningExecutions = executions.filter(
      (e: ExecutionRow) => e.status === ExecutionStatus.EXECUTING
    ).length;
    const failedExecutions = executions.filter(
      (e: ExecutionRow) => e.status === ExecutionStatus.ERROR
    ).length;
    const completedExecutions = executions.filter(
      (e: ExecutionRow) =>
        e.status === ExecutionStatus.COMPLETED && e.startedAt && e.endedAt
    );
    const avgTimeSeconds =
      completedExecutions.length > 0
        ? Math.round(
            completedExecutions.reduce(
              (sum: number, e: ExecutionRow) =>
                sum + (Number(e.endedAt) - Number(e.startedAt)) / 1000,
              0
            ) / completedExecutions.length
          )
        : 0;

    // Recent executions (last 10)
    const recentExecutions = executions.slice(0, 10).map((e: ExecutionRow) => ({
      id: e.id,
      workflowName: workflows.find((w) => w.id === e.workflowId)?.name || "",
      status: e.status,
      startedAt: e.startedAt ? Number(e.startedAt) : Date.now(),
      endedAt: e.endedAt ? Number(e.endedAt) : undefined,
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
