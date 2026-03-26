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
import { isUuid, parseUuid } from "../utils/validation";

const executionRoutes = new Hono<ApiContext>();

executionRoutes.get("/:id", apiKeyOrJwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;
  const id = c.req.param("id");

  if (!isUuid(id)) {
    return c.json({ error: "Invalid execution ID format" }, 400);
  }

  const executionStore = new CloudflareExecutionStore(c.env);
  const db = createDatabase(c.env.DB);

  try {
    const execution = await executionStore.getWithData(id, organizationId);

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    const workflowExecution: WorkflowExecution = {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: execution.workflowName,
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
  const { workflowId, limit, offset } = c.req.query();

  const organizationId = c.get("organizationId")!;

  const validatedWorkflowId = parseUuid(workflowId);

  // Parse and validate pagination params
  const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const parsedOffset = Math.min(Math.max(0, parseInt(offset, 10) || 0), 10000);

  // List executions with optional filtering
  const queryParams: ListExecutionsRequest = {
    workflowId: validatedWorkflowId,
    limit: parsedLimit,
    offset: parsedOffset,
  };

  const executions = await executionStore.list(organizationId, queryParams);

  const results = executions.map((execution) => {
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: execution.workflowName,
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

/**
 * Submit human input for a pending node in a running execution.
 * Used for headless triggers (email, HTTP, cron) where no WebSocket is available.
 */
executionRoutes.post(
  "/:executionId/nodes/:nodeId/input",
  apiKeyOrJwtMiddleware,
  async (c) => {
    const executionId = c.req.param("executionId");
    const nodeId = c.req.param("nodeId");

    if (!isUuid(executionId)) {
      return c.json({ error: "Invalid execution ID format" }, 400);
    }

    const body = await c.req.json<{
      text?: string;
      approved?: boolean;
      metadata?: Record<string, unknown>;
    }>();

    try {
      const instance = await c.env.EXECUTE.get(executionId);
      await instance.sendEvent({
        type: `human-input-${nodeId}`,
        payload: {
          outputs: {
            response: body.text ?? "",
            approved: body.approved ?? false,
            metadata: body.metadata ?? {},
          },
          usage: 0,
        },
      });

      return c.json({ success: true });
    } catch (error) {
      console.error("Error submitting human input:", error);
      return c.json({ error: "Failed to submit human input" }, 500);
    }
  }
);

export default executionRoutes;
