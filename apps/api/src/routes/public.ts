import {
  GetPublicExecutionResponse,
  ObjectReference,
  PublicExecutionWithStructure,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { ApiContext } from "../context";
import { createDatabase } from "../db";
import {
  executions as executionsTable,
  getPublicExecutionById,
  getWorkflowByIdOrHandle,
} from "../db";
import { ObjectStore } from "../runtime/object-store";

const publicRoutes = new Hono<ApiContext>();

// Public Objects Route
publicRoutes.get("/objects", async (c) => {
  const objectId = c.req.query("id");
  const mimeType = c.req.query("mimeType");

  if (!objectId || !mimeType) {
    return c.text("Missing required parameters: id and mimeType", 400);
  }

  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    const reference: ObjectReference = { id: objectId, mimeType };
    const result = await objectStore.readObject(reference);

    if (!result) {
      return c.text("Object not found", 404);
    }

    const { data, metadata } = result;

    if (!metadata?.executionId) {
      return c.text("Object is not linked to an execution", 404);
    }

    const db = createDatabase(c.env.DB);
    const [execution] = await db
      .select({
        visibility: executionsTable.visibility,
        organizationId: executionsTable.organizationId,
      })
      .from(executionsTable)
      .where(eq(executionsTable.id, metadata.executionId));

    if (!execution) {
      return c.text("Object not found or linked to invalid execution", 404);
    }

    if (execution.visibility !== "public") {
      return c.text(
        "Forbidden: You do not have access to this object via its execution",
        403
      );
    }

    return c.body(data, {
      headers: {
        "content-type": mimeType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Object retrieval error:", error);
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return c.text(error.message, 403);
    }
    return c.text("Object not found or error retrieving object", 404);
  }
});

// Public Executions Route
publicRoutes.get("/executions/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  try {
    const executionRecord = await getPublicExecutionById(db, id);

    if (!executionRecord) {
      return c.json({ error: "Execution not found or not public" }, 404);
    }

    let workflowNodes: Workflow["nodes"] = [];
    let workflowEdges: Workflow["edges"] = [];
    let workflowName = "Unknown Workflow";

    const workflowRecord = await getWorkflowByIdOrHandle(
      db,
      executionRecord.workflowId
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

// Public Images Route
publicRoutes.get("/images/:key", async (c) => {
  const key = c.req.param("key");

  try {
    const object = await c.env.BUCKET.get("images/" + key);
    const mimeType = object?.httpMetadata?.contentType;

    if (!object || !mimeType) {
      return c.text("Image not found", 404);
    }

    const image = new Uint8Array(await object.arrayBuffer());

    return c.body(image, {
      headers: {
        "content-type": mimeType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Object retrieval error:", error);
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return c.text(error.message, 403);
    }
    return c.text("Object not found or error retrieving object", 404);
  }
});

export default publicRoutes;
