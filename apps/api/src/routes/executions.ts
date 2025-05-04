import { Hono } from "hono";
import { WorkflowExecution, WorkflowExecutionStatus } from "@dafthunk/types";
import { ApiContext, CustomJWTPayload } from "../context";
import { createDatabase } from "../db";
import { jwtAuth } from "../auth";
import { getExecutionById } from "../utils/db";
import { listExecutions } from "../utils/db";

const executionRoutes = new Hono<ApiContext>();

executionRoutes.get("/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  try {
    const execution = await getExecutionById(db, id, user.organizationId);

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    const executionData = execution.data as WorkflowExecution;
    const workflowExecution: WorkflowExecution = {
      id: execution.id,
      workflowId: execution.workflowId,
      deploymentId: execution.deploymentId ?? undefined,
      status: execution.status as WorkflowExecutionStatus,
      nodeExecutions: executionData.nodeExecutions || [],
      error: execution.error || undefined,
    };

    return c.json(workflowExecution);
  } catch (error) {
    console.error("Error retrieving execution:", error);
    return c.json({ error: "Failed to retrieve execution" }, 500);
  }
});

executionRoutes.get("/", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const db = createDatabase(c.env.DB);
  const { workflowId, deploymentId, limit, offset } = c.req.query();

  // Parse pagination params
  const parsedLimit = limit ? parseInt(limit, 10) : 20;
  const parsedOffset = offset ? parseInt(offset, 10) : 0;

  // List executions with optional filtering
  const executions = await listExecutions(db, user.organizationId, {
    workflowId: workflowId || undefined,
    deploymentId: deploymentId || undefined,
    limit: parsedLimit,
    offset: parsedOffset,
  });

  // Map to WorkflowExecution type
  const results = executions.map((execution) => {
    const executionData = execution.data as WorkflowExecution;
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      deploymentId: execution.deploymentId ?? undefined,
      status: execution.status as WorkflowExecutionStatus,
      nodeExecutions: executionData.nodeExecutions || [],
      error: execution.error || undefined,
    };
  });

  return c.json({ executions: results });
});

export default executionRoutes;
