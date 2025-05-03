import { Hono } from "hono";
import { WorkflowExecution, WorkflowExecutionStatus } from "@dafthunk/types";
import { ApiContext, CustomJWTPayload } from "../context";
import { createDatabase } from "../db";
import { jwtAuth } from "../auth";
import { getExecutionById } from "../utils/db";

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

export default executionRoutes;
