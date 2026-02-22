import {
  GetExecutionResponse,
  ListExecutionsRequest,
  ListExecutionsResponse,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase } from "../db";
import { feedback } from "../db/schema";
import { CloudflareExecutionStore } from "../runtime/cloudflare-execution-store";
import { WorkflowStore } from "../stores/workflow-store";

const executionRoutes = new Hono<ApiContext>();

// UUID v7 format validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a string is a valid UUID format.
 * Returns the string if valid, undefined if invalid or empty.
 */
function validateUuid(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return UUID_REGEX.test(value) ? value : undefined;
}

executionRoutes.get("/:id", apiKeyOrJwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;
  const id = c.req.param("id");

  // Validate execution ID format to prevent SQL injection
  if (!UUID_REGEX.test(id)) {
    return c.json({ error: "Invalid execution ID format" }, 400);
  }

  const executionStore = new CloudflareExecutionStore(c.env);
  const db = createDatabase(c.env.DB);

  try {
    const execution = await executionStore.getWithData(id, organizationId);

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    // Get workflow name
    const workflowStore = new WorkflowStore(c.env);
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

    // Get execution feedback (multi-criteria)
    const feedbackRows = await db.query.feedback.findMany({
      where: eq(feedback.executionId, id),
      with: {
        criterion: { columns: { question: true } },
      },
    });

    const response: GetExecutionResponse = {
      execution: workflowExecution,
      feedback:
        feedbackRows.length > 0
          ? feedbackRows.map((f) => ({
              id: f.id,
              executionId: f.executionId,
              criterionId: f.criterionId,
              criterionQuestion: (f.criterion as { question: string } | null)
                ?.question,
              deploymentId: f.deploymentId ?? undefined,
              sentiment: f.sentiment,
              comment: f.comment ?? undefined,
              createdAt: f.createdAt,
              updatedAt: f.updatedAt,
            }))
          : undefined,
    };
    return c.json(response);
  } catch (error) {
    console.error("Error retrieving execution:", error);
    return c.json({ error: "Failed to retrieve execution" }, 500);
  }
});

executionRoutes.get("/", jwtMiddleware, async (c) => {
  const executionStore = new CloudflareExecutionStore(c.env);
  const workflowStore = new WorkflowStore(c.env);
  const { workflowId, deploymentId, limit, offset } = c.req.query();

  const organizationId = c.get("organizationId")!;

  // Validate UUID parameters to prevent SQL injection
  const validatedWorkflowId = validateUuid(workflowId);
  const validatedDeploymentId = validateUuid(deploymentId);

  // Parse and validate pagination params
  const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

  // List executions with optional filtering
  const queryParams: ListExecutionsRequest = {
    workflowId: validatedWorkflowId,
    deploymentId: validatedDeploymentId,
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
      usage: execution.usage ?? 0,
    };
  });

  const response: ListExecutionsResponse = { executions: results };
  return c.json(response);
});

export default executionRoutes;
