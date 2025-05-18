import {
  GetPublicExecutionResponse,
  PublicExecutionWithStructure,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { ApiContext } from "../context";
import { createDatabase } from "../db";
import { executions as executionsTable } from "../db/schema";
import { getWorkflowByIdOrHandle } from "../utils/db";

const publicExecutionRoutes = new Hono<ApiContext>();

publicExecutionRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  try {
    const [executionRecord] = await db
      .select()
      .from(executionsTable)
      .where(
        and(
          eq(executionsTable.id, id),
          eq(executionsTable.visibility, "public")
        )
      );

    if (!executionRecord) {
      return c.json({ error: "Execution not found or not public" }, 404);
    }

    let workflowNodes: Workflow["nodes"] = [];
    let workflowEdges: Workflow["edges"] = [];
    let workflowName = "Unknown Workflow";

    const workflowRecord = await getWorkflowByIdOrHandle(
      db,
      executionRecord.workflowId,
      executionRecord.organizationId
    );

    if (workflowRecord) {
      const workflowDataFromDb = workflowRecord.data as Workflow;
      workflowNodes = workflowDataFromDb.nodes || [];
      workflowEdges = workflowDataFromDb.edges || [];
      workflowName = workflowRecord.name || workflowName;
    }

    const executionData = executionRecord.data as WorkflowExecution;
    const responseExecution: PublicExecutionWithStructure = {
      id: executionRecord.id,
      workflowId: executionRecord.workflowId,
      workflowName: workflowName,
      deploymentId: executionRecord.deploymentId ?? undefined,
      status: executionRecord.status as WorkflowExecutionStatus,
      nodeExecutions: executionData.nodeExecutions || [],
      error: executionRecord.error || undefined,
      visibility: executionRecord.visibility,
      startedAt: executionRecord.startedAt ?? executionData.startedAt,
      endedAt: executionRecord.endedAt ?? executionData.endedAt,
      nodes: workflowNodes,
      edges: workflowEdges,
    };

    const response: GetPublicExecutionResponse = {
      execution: responseExecution,
    };
    return c.json(response);
  } catch (error) {
    console.error("Error retrieving public execution:", error);
    return c.json({ error: "Failed to retrieve public execution" }, 500);
  }
});

export default publicExecutionRoutes;
