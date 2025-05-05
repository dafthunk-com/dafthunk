import { Hono } from "hono";
import { ApiContext } from "../context";
const { getWorkflowsByOrganization } = require("../utils/db");
const { getDeploymentsGroupedByWorkflow } = require("../utils/db");
const { listExecutions } = require("../utils/db");
const { jwtAuth } = require("../auth");
const { createDatabase } = require("../db");
const { ExecutionStatus } = require("../db/schema");
import type { Workflow, Execution } from "../db/schema";

const dashboard = new Hono<ApiContext>();

dashboard.get("/", jwtAuth, async (c) => {
  const user = c.get("jwtPayload");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const db = createDatabase(c.env.DB);

  // Workflows count
  const workflows: Workflow[] = await getWorkflowsByOrganization(db, user.organizationId);
  const workflowsCount = workflows.length;

  // Deployments count
  const deployments = await getDeploymentsGroupedByWorkflow(db, user.organizationId);
  const deploymentsCount = deployments.reduce((acc: number, w: { deploymentCount: number }) => acc + w.deploymentCount, 0);

  // Executions stats
  const executions: Execution[] = await listExecutions(db, user.organizationId, { limit: 100 }); // limit for perf
  const totalExecutions = executions.length;
  const runningExecutions = executions.filter((e: Execution) => e.status === ExecutionStatus.EXECUTING).length;
  const failedExecutions = executions.filter((e: Execution) => e.status === ExecutionStatus.ERROR).length;
  const completedExecutions = executions.filter((e: Execution) => e.status === ExecutionStatus.COMPLETED && e.startedAt && e.endedAt);
  const avgTimeSeconds = completedExecutions.length > 0
    ? Math.round(
        completedExecutions.reduce(
          (sum: number, e: Execution) => sum + ((Number(e.endedAt) - Number(e.startedAt)) / 1000),
          0
        ) / completedExecutions.length
      )
    : 0;

  // Recent executions (last 3)
  const recentExecutions = executions.slice(0, 3).map((e: Execution) => ({
    id: e.id,
    workflowName: workflows.find((w: Workflow) => w.id === e.workflowId)?.name || "",
    status: e.status,
    startedAt: e.startedAt,
  }));

  return c.json({
    workflows: workflowsCount,
    deployments: deploymentsCount,
    executions: {
      total: totalExecutions,
      running: runningExecutions,
      failed: failedExecutions,
      avgTimeSeconds,
    },
    recentExecutions,
  });
});

export default dashboard; 