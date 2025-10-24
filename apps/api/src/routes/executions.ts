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
import { ExecutionStore } from "../stores/execution-store";
import { WorkflowStore } from "../stores/workflow-store";

const executionRoutes = new Hono<ApiContext>();

executionRoutes.get("/:id", apiKeyOrJwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;
  const id = c.req.param("id");
  const executionStore = new ExecutionStore(c.env);

  try {
    const execution = await executionStore.getWithData(id, organizationId);

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    // Get workflow name
    const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);
    const workflowName = await workflowStore.getName(
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
  const executionStore = new ExecutionStore(c.env);
  const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);
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
  const workflowNames = await workflowStore.getNames(workflowIds);
  const workflowMap = new Map(workflowNames.map((w) => [w.id, w.name]));

  const results = executions.map((execution) => {
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: workflowMap.get(execution.workflowId) || "Unknown Workflow",
      deploymentId: execution.deploymentId ?? undefined,
      status: execution.status as WorkflowExecutionStatus,
      error: execution.error || undefined,
      startedAt: execution.startedAt || undefined,
      endedAt: execution.endedAt || undefined,
    };
  });

  const response: ListExecutionsResponse = { executions: results };
  return c.json(response);
});

export default executionRoutes;
