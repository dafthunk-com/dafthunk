import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { WorkflowExecution, WorkflowExecutionStatus } from "@dafthunk/types";
import { ApiContext } from "../context";
import { createDatabase, executions } from "../db";
import { jwtAuth } from "./auth";

const executionRoutes = new Hono<ApiContext>();

executionRoutes.get("/:id", jwtAuth, async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  try {
    const execution = await db
      .select()
      .from(executions)
      .where(eq(executions.id, id))
      .get();

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    const executionData = JSON.parse(execution.data as string);
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
