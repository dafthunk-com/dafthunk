import { Hono } from "hono";
import { Node, Workflow as WorkflowType } from "@dafthunk/types";
import { ApiContext, CustomJWTPayload } from "../context";
import { createDatabase, type NewWorkflow } from "../db";
import { jwtAuth } from "../auth";
import { validateWorkflow } from "../utils/workflows";
import { v7 as uuid } from "uuid";
import {
  getWorkflowsByOrganization,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  saveExecution,
} from "../utils/db";

const workflowRoutes = new Hono<ApiContext>();

workflowRoutes.get("/", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const db = createDatabase(c.env.DB);

  const allWorkflows = await getWorkflowsByOrganization(
    db,
    user.organization.id
  );

  return c.json({ workflows: allWorkflows });
});

workflowRoutes.post("/", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const data = await c.req.json();
  const now = new Date();

  const workflowData: WorkflowType = {
    id: uuid(),
    name: data.name || "Untitled Workflow",
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
  };

  const newWorkflowData: NewWorkflow = {
    id: workflowData.id,
    name: workflowData.name,
    data: workflowData,
    organizationId: user.organization.id,
    createdAt: now,
    updatedAt: now,
  };

  const validationErrors = validateWorkflow(workflowData);
  if (validationErrors.length > 0) {
    return c.json({ errors: validationErrors }, 400);
  }

  const db = createDatabase(c.env.DB);
  const newWorkflow = await createWorkflow(db, newWorkflowData);

  const workflowDataFromDb = newWorkflow.data as WorkflowType;

  return c.json(
    {
      id: newWorkflow.id,
      name: newWorkflow.name,
      createdAt: newWorkflow.createdAt,
      updatedAt: newWorkflow.updatedAt,
      nodes: workflowDataFromDb.nodes,
      edges: workflowDataFromDb.edges,
    },
    201
  );
});

workflowRoutes.get("/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const workflow = await getWorkflowById(db, id, user.organization.id);

  if (!workflow) {
    return c.text("Workflow not found", 404);
  }

  const workflowData = workflow.data as WorkflowType;

  return c.json({
    id: workflow.id,
    name: workflow.name,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
  });
});

workflowRoutes.put("/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const existingWorkflow = await getWorkflowById(db, id, user.organization.id);

  if (!existingWorkflow) {
    return c.text("Workflow not found", 404);
  }

  const data = await c.req.json();
  const now = new Date();

  // Sanitize nodes to prevent saving binary data and connected values
  const sanitizedNodes = Array.isArray(data.nodes)
    ? data.nodes.map((node: any) => {
        const incomingEdges = Array.isArray(data.edges)
          ? data.edges.filter((edge: any) => edge.target === node.id)
          : [];

        return {
          ...node,
          inputs: Array.isArray(node.inputs)
            ? node.inputs.map((input: any) => ({
                ...input,
                value: incomingEdges.some(
                  (edge: any) => edge.targetInput === input.name
                )
                  ? undefined
                  : input.value,
              }))
            : [],
          outputs: Array.isArray(node.outputs)
            ? node.outputs.map((output: any) => ({
                ...output,
                value: undefined,
              }))
            : [],
        };
      })
    : [];

  const workflowToValidate = {
    nodes: sanitizedNodes,
    edges: Array.isArray(data.edges) ? data.edges : [],
  };
  const validationErrors = validateWorkflow(workflowToValidate as any);
  if (validationErrors.length > 0) {
    return c.json({ errors: validationErrors }, 400);
  }

  const updatedWorkflowData: WorkflowType = {
    id: existingWorkflow.id,
    name: data.name,
    nodes: sanitizedNodes,
    edges: Array.isArray(data.edges) ? data.edges : [],
  };

  const updatedWorkflow = await updateWorkflow(db, id, user.organization.id, {
    name: data.name,
    data: updatedWorkflowData,
    updatedAt: now,
  });

  const workflowDataFromDb = updatedWorkflow.data as WorkflowType;

  return c.json({
    id: updatedWorkflow.id,
    name: updatedWorkflow.name,
    createdAt: updatedWorkflow.createdAt,
    updatedAt: updatedWorkflow.updatedAt,
    nodes: workflowDataFromDb.nodes || [],
    edges: workflowDataFromDb.edges || [],
  });
});

workflowRoutes.delete("/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const existingWorkflow = await getWorkflowById(db, id, user.organization.id);

  if (!existingWorkflow) {
    return c.text("Workflow not found", 404);
  }

  const deletedWorkflow = await deleteWorkflow(db, id, user.organization.id);

  if (!deletedWorkflow) {
    return c.json({ error: "Failed to delete workflow" }, 500);
  }

  return c.json({ id: deletedWorkflow.id });
});

workflowRoutes.post("/:id/execute", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const monitorProgress =
    new URL(c.req.url).searchParams.get("monitorProgress") === "true";
  const workflow = await getWorkflowById(db, id, user.organization.id);

  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflowData = workflow.data as WorkflowType;

  // Validate if workflow has nodes
  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    return c.json(
      {
        error:
          "Cannot execute an empty workflow. Please add nodes to the workflow.",
      },
      400
    );
  }

  // Extract HTTP request information
  const headers = c.req.header();
  const url = c.req.url;
  const method = c.req.method;
  const query = Object.fromEntries(new URL(c.req.url).searchParams.entries());

  // Try to parse form data
  let formData: Record<string, string | File> | undefined;
  try {
    formData = Object.fromEntries(await c.req.formData());
  } catch {
    // No form data or invalid form data
  }

  // Get request body if it exists
  let body: any = undefined;
  try {
    body = await c.req.json();
  } catch {
    // No body or invalid JSON
  }

  // Trigger the runtime and get the instance id
  const instance = await c.env.EXECUTE.create({
    params: {
      userId: user.sub,
      organizationId: user.organization.id,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      },
      monitorProgress,
      httpRequest: {
        url,
        method,
        headers,
        query,
        formData,
        body,
      },
    },
  });
  const executionId = instance.id;

  // Build initial nodeExecutions (all idle)
  const nodeExecutions = workflowData.nodes.map((node: Node) => ({
    nodeId: node.id,
    status: "idle",
  }));

  // Save initial execution record
  const initialExecution = await saveExecution(db, {
    id: executionId,
    workflowId: workflow.id,
    userId: user.sub,
    organizationId: user.organization.id,
    status: "idle",
    nodeExecutions,
    visibility: "private",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return c.json(
    {
      id: initialExecution.id,
      workflowId: initialExecution.workflowId,
      status: initialExecution.status,
      nodeExecutions: initialExecution.nodeExecutions,
    },
    201
  );
});

export default workflowRoutes;
