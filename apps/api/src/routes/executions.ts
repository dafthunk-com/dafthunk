import {
  GetExecutionResponse,
  ListExecutionsRequest,
  ListExecutionsResponse,
  UpdateExecutionVisibilityResponse,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import { Hono } from "hono";

import { jwtAuth } from "../auth";
import { ApiContext, CustomJWTPayload } from "../context";
import {
  createDatabase,
  getExecutionById,
  getExecutionWithVisibility,
  getWorkflowNameById,
  getWorkflowNamesByIds,
  listExecutions,
  updateExecutionOgImageStatus,
  updateExecutionToPrivate,
  updateExecutionToPublic,
} from "../db";
import { generateExecutionOgImage } from "../utils/og-image-generator";

const executionRoutes = new Hono<ApiContext>();

executionRoutes.get("/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  try {
    const execution = await getExecutionById(db, id, user.organization.id);

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    // Get workflow name
    const workflowName = await getWorkflowNameById(db, execution.workflowId);

    const executionData = execution.data as WorkflowExecution;
    const workflowExecution: WorkflowExecution = {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: workflowName || "Unknown Workflow",
      deploymentId: execution.deploymentId ?? undefined,
      status: execution.status as WorkflowExecutionStatus,
      nodeExecutions: executionData.nodeExecutions || [],
      error: execution.error || undefined,
      visibility: execution.visibility,
      startedAt: execution.startedAt ?? executionData.startedAt,
      endedAt: execution.endedAt ?? executionData.endedAt,
    };

    const response: GetExecutionResponse = { execution: workflowExecution };
    return c.json(response);
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
  const queryParams: ListExecutionsRequest = {
    workflowId: workflowId || undefined,
    deploymentId: deploymentId || undefined,
    limit: parsedLimit,
    offset: parsedOffset,
  };

  const executions = await listExecutions(
    db,
    user.organization.id,
    queryParams
  );

  // Get workflow names for all executions
  const workflowIds = [...new Set(executions.map((e) => e.workflowId))];
  const workflowNames = await getWorkflowNamesByIds(db, workflowIds);
  const workflowMap = new Map(workflowNames.map((w) => [w.id, w.name]));

  // Map to WorkflowExecution type
  const results = executions.map((execution) => {
    const executionData = execution.data as WorkflowExecution;
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: workflowMap.get(execution.workflowId) || "Unknown Workflow",
      deploymentId: execution.deploymentId ?? undefined,
      status: execution.status as WorkflowExecutionStatus,
      nodeExecutions: executionData.nodeExecutions || [],
      error: execution.error || undefined,
      visibility: execution.visibility,
      startedAt: execution.startedAt ?? executionData.startedAt,
      endedAt: execution.endedAt ?? executionData.endedAt,
    };
  });

  const response: ListExecutionsResponse = { executions: results };
  return c.json(response);
});

executionRoutes.patch("/:id/share/public", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const executionId = c.req.param("id");
  const db = createDatabase(c.env.DB);

  try {
    const execution = await getExecutionWithVisibility(
      db,
      executionId,
      user.organization.id
    );

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    await updateExecutionToPublic(db, executionId, user.organization.id);

    if (!execution.ogImageGenerated && c.env.BROWSER) {
      try {
        await generateExecutionOgImage({
          env: c.env,
          executionId: executionId,
          organizationId: user.organization.id,
        });

        await updateExecutionOgImageStatus(db, executionId);
        console.log(
          `Execution ${executionId} updated with OG image generation status.`
        );
      } catch (error) {
        console.error(
          `OG image generation step failed for execution ${executionId}, but execution is now public. Error: ${error}`
        );
      }
    }

    const response: UpdateExecutionVisibilityResponse = {
      success: true,
      message: "Execution set to public",
    };
    return c.json(response);
  } catch (error) {
    console.error("Error setting execution to public:", error);
    return c.json({ error: "Failed to set execution to public" }, 500);
  }
});

executionRoutes.patch("/:id/share/private", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  try {
    const execution = await getExecutionById(db, id, user.organization.id);

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    if (execution.organizationId !== user.organization.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await updateExecutionToPrivate(db, id, user.organization.id);

    const response: UpdateExecutionVisibilityResponse = {
      success: true,
      message: "Execution set to private",
    };
    return c.json(response);
  } catch (error) {
    console.error("Error setting execution to private:", error);
    return c.json({ error: "Failed to set execution to private" }, 500);
  }
});

export default executionRoutes;
