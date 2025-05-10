import { Hono } from "hono";
import {
  WorkflowExecution,
  WorkflowExecutionStatus,
  Workflow as WorkflowStructureType,
} from "@dafthunk/types";
import { ApiContext, CustomJWTPayload } from "../context";
import { createDatabase } from "../db";
import { jwtAuth } from "../auth";
import { getExecutionById } from "../utils/db";
import { listExecutions } from "../utils/db";
import { workflows } from "../db";
import { eq, inArray, and } from "drizzle-orm";
import { executions as executionsTable } from "../db/schema";
import { getWorkflowById } from "../utils/db";
import { generateExecutionOgImage } from "../utils/ogImageGenerator";

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

    // Get workflow name
    const [workflow] = await db
      .select({ name: workflows.name })
      .from(workflows)
      .where(eq(workflows.id, execution.workflowId));

    const executionData = execution.data as WorkflowExecution;
    const workflowExecution: WorkflowExecution = {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: workflow?.name || "Unknown Workflow",
      deploymentId: execution.deploymentId ?? undefined,
      status: execution.status as WorkflowExecutionStatus,
      nodeExecutions: executionData.nodeExecutions || [],
      error: execution.error || undefined,
      visibility: execution.visibility,
      startedAt: execution.startedAt ?? executionData.startedAt,
      endedAt: execution.endedAt ?? executionData.endedAt,
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

  // Get workflow names for all executions
  const workflowIds = [...new Set(executions.map((e) => e.workflowId))];
  const workflowNames = await db
    .select({ id: workflows.id, name: workflows.name })
    .from(workflows)
    .where(inArray(workflows.id, workflowIds));

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

  return c.json({ executions: results });
});

executionRoutes.patch("/:id/share/public", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const executionId = c.req.param("id");
  const db = createDatabase(c.env.DB);

  try {
    const [execution] = await db
      .select({
        id: executionsTable.id,
        organizationId: executionsTable.organizationId,
        ogImageGenerated: executionsTable.ogImageGenerated,
      })
      .from(executionsTable)
      .where(
        and(
          eq(executionsTable.id, executionId),
          eq(executionsTable.organizationId, user.organizationId)
        )
      );

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    await db
      .update(executionsTable)
      .set({ visibility: "public", updatedAt: new Date() })
      .where(eq(executionsTable.id, executionId));

    if (!execution.ogImageGenerated && c.env.BROWSER) {
      try {
        await generateExecutionOgImage({
          env: c.env,
          executionId: executionId,
          organizationId: user.organizationId,
        });

        await db
          .update(executionsTable)
          .set({ ogImageGenerated: true, updatedAt: new Date() })
          .where(eq(executionsTable.id, executionId));
        console.log(
          `Execution ${executionId} updated with OG image generation status.`
        );
      } catch (error) {
        console.error(
          `OG image generation step failed for execution ${executionId}, but execution is now public. Error: ${error}`
        );
      }
    }

    return c.json({ message: "Execution set to public" });
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
    const execution = await getExecutionById(db, id, user.organizationId);

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    if (execution.organizationId !== user.organizationId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await db
      .update(executionsTable)
      .set({ visibility: "private", updatedAt: new Date() })
      .where(eq(executionsTable.id, id));

    return c.json({ message: "Execution set to private" });
  } catch (error) {
    console.error("Error setting execution to private:", error);
    return c.json({ error: "Failed to set execution to private" }, 500);
  }
});

executionRoutes.get("/public/:id", async (c) => {
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

    let workflowNodes: WorkflowStructureType["nodes"] = [];
    let workflowEdges: WorkflowStructureType["edges"] = [];
    let workflowName = "Unknown Workflow";

    const workflowRecord = await getWorkflowById(
      db,
      executionRecord.workflowId,
      executionRecord.organizationId
    );

    if (workflowRecord) {
      const workflowDataFromDb = workflowRecord.data as WorkflowStructureType;
      workflowNodes = workflowDataFromDb.nodes || [];
      workflowEdges = workflowDataFromDb.edges || [];
      workflowName = workflowRecord.name || workflowName;
    }

    const executionData = executionRecord.data as WorkflowExecution;
    const responseExecution: WorkflowExecution & {
      nodes?: any[];
      edges?: any[];
    } = {
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

    return c.json(responseExecution);
  } catch (error) {
    console.error("Error retrieving public execution:", error);
    return c.json({ error: "Failed to retrieve public execution" }, 500);
  }
});

export default executionRoutes;
