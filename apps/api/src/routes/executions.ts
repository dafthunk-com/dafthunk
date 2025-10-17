import {
  GetExecutionResponse,
  ListExecutionsRequest,
  ListExecutionsResponse,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import { Hono } from "hono";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase, getWorkflowName, getWorkflowNames } from "../db";
import { ExecutionStore } from "../runtime/execution-store";
import { ObjectStore } from "../runtime/object-store";

const executionRoutes = new Hono<ApiContext>();

executionRoutes.get("/:id", apiKeyOrJwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;
  const id = c.req.param("id");
  const executionStore = new ExecutionStore(c.env.DB, c.env.RESSOURCES);

  try {
    const execution = await executionStore.getWithData(id, organizationId);

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    // Get workflow name
    const db = createDatabase(c.env.DB);
    const workflowName = await getWorkflowName(
      db,
      execution.workflowId,
      organizationId
    );

    const workflowExecution: WorkflowExecution = {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: workflowName || "Unknown Workflow",
      deploymentId: execution.deploymentId ?? undefined,
      status: execution.status as WorkflowExecutionStatus,
      nodeExecutions: execution.data.nodeExecutions || [],
      error: execution.error || undefined,
      startedAt: execution.startedAt ?? execution.data.startedAt,
      endedAt: execution.endedAt ?? execution.data.endedAt,
    };

    const response: GetExecutionResponse = { execution: workflowExecution };
    return c.json(response);
  } catch (error) {
    console.error("Error retrieving execution:", error);
    return c.json({ error: "Failed to retrieve execution" }, 500);
  }
});

executionRoutes.get("/", jwtMiddleware, async (c) => {
  const executionStore = new ExecutionStore(c.env.DB, c.env.RESSOURCES);
  const db = createDatabase(c.env.DB);
  const { workflowId, deploymentId, limit, offset } = c.req.query();

  const organizationId = c.get("organizationId")!;

  // Parse pagination params
  const parsedLimit = limit ? parseInt(limit, 10) : 20;
  const parsedOffset = offset ? parseInt(offset, 10) : 0;

  // List executions with optional filtering
  const queryParams: ListExecutionsRequest = {
    workflowId: workflowId || undefined,
    deploymentId: deploymentId || undefined,
    limit: parsedLimit,
    offset: parsedOffset,
  };

  const executions = await executionStore.list(organizationId, queryParams);

  // Get workflow names for all executions
  const workflowIds = [...new Set(executions.map((e) => e.workflowId))];
  const workflowNames = await getWorkflowNames(db, workflowIds);
  const workflowMap = new Map(workflowNames.map((w) => [w.id, w.name]));

  // Load all execution data from R2 in parallel
  const objectStore = new ObjectStore(c.env.RESSOURCES);
  const results = await Promise.all(
    executions.map(async (execution) => {
      let executionData;
      try {
        executionData = await objectStore.readExecution(execution.id);
      } catch (error) {
        console.error(
          `Failed to load execution data from R2 for ${execution.id}:`,
          error
        );
        // Fallback to empty data if R2 read fails
        executionData = {
          id: execution.id,
          workflowId: execution.workflowId,
          status: execution.status as WorkflowExecutionStatus,
          nodeExecutions: [],
        };
      }

      return {
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName:
          workflowMap.get(execution.workflowId) || "Unknown Workflow",
        deploymentId: execution.deploymentId ?? undefined,
        status: execution.status as WorkflowExecutionStatus,
        nodeExecutions: executionData.nodeExecutions || [],
        error: execution.error || undefined,
        startedAt: execution.startedAt ?? executionData.startedAt,
        endedAt: execution.endedAt ?? executionData.endedAt,
      };
    })
  );

  const response: ListExecutionsResponse = { executions: results };
  return c.json(response);
});

export default executionRoutes;
