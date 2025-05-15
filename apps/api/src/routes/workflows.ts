import { Hono } from "hono";
import {
  Node,
  Workflow as WorkflowType,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  ListWorkflowsResponse,
  GetWorkflowResponse,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  DeleteWorkflowResponse,
  ExecuteWorkflowResponse,
  NodeExecution,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import { ApiContext, CustomJWTPayload } from "../context";
import { createDatabase, type NewWorkflow, ExecutionStatus } from "../db";
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
  createHandle,
} from "../utils/db";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const workflowRoutes = new Hono<ApiContext>();

/**
 * GET /api/workflows
 *
 * List all workflows for the current organization
 */
workflowRoutes.get("/", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const db = createDatabase(c.env.DB);

  const allWorkflows = await getWorkflowsByOrganization(
    db,
    user.organization.id
  );

  // Convert DB workflow objects to WorkflowWithMetadata objects
  const workflows: WorkflowWithMetadata[] = allWorkflows.map((workflow) => {
    // For list endpoint, we don't have the data field, so create empty nodes/edges
    return {
      id: workflow.id,
      name: workflow.name,
      handle: workflow.handle,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      nodes: [],
      edges: [],
    };
  });

  const response: ListWorkflowsResponse = { workflows };
  return c.json(response);
});

/**
 * POST /api/workflows
 *
 * Create a new workflow for the current organization
 */
workflowRoutes.post(
  "/",
  jwtAuth,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Workflow name is required"),
      nodes: z.array(z.any()).optional(),
      edges: z.array(z.any()).optional(),
    }) as z.ZodType<CreateWorkflowRequest>
  ),
  async (c) => {
    const user = c.get("jwtPayload") as CustomJWTPayload;
    const data = c.req.valid("json");
    const now = new Date();

    const workflowName = data.name || "Untitled Workflow";
    const workflowData: WorkflowType = {
      id: uuid(),
      name: workflowName,
      handle: createHandle(workflowName),
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
    };

    const newWorkflowData: NewWorkflow = {
      id: workflowData.id,
      name: workflowData.name,
      handle: workflowData.handle,
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

    const response: CreateWorkflowResponse = {
      id: newWorkflow.id,
      name: newWorkflow.name,
      handle: newWorkflow.handle,
      createdAt: newWorkflow.createdAt,
      updatedAt: newWorkflow.updatedAt,
      nodes: workflowDataFromDb.nodes,
      edges: workflowDataFromDb.edges,
    };

    return c.json(response, 201);
  }
);

/**
 * GET /api/workflows/:id
 *
 * Get a specific workflow by ID
 */
workflowRoutes.get("/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const workflow = await getWorkflowById(db, id, user.organization.id);

  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflowData = workflow.data as WorkflowType;

  const response: GetWorkflowResponse = {
    id: workflow.id,
    name: workflow.name,
    handle: workflow.handle,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
  };

  return c.json(response);
});

/**
 * PUT /api/workflows/:id
 *
 * Update a workflow by ID
 */
workflowRoutes.put(
  "/:id",
  jwtAuth,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Workflow name is required"),
      nodes: z.array(z.any()).optional(),
      edges: z.array(z.any()).optional(),
    }) as z.ZodType<UpdateWorkflowRequest>
  ),
  async (c) => {
    const user = c.get("jwtPayload") as CustomJWTPayload;
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);

    const existingWorkflow = await getWorkflowById(
      db,
      id,
      user.organization.id
    );

    if (!existingWorkflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const data = c.req.valid("json");
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

    const workflowToValidate: WorkflowType = {
      id: existingWorkflow.id,
      name: data.name ?? existingWorkflow.name,
      handle: existingWorkflow.handle,
      nodes: sanitizedNodes,
      edges: Array.isArray(data.edges) ? data.edges : [],
    };
    const validationErrors = validateWorkflow(workflowToValidate);
    if (validationErrors.length > 0) {
      return c.json({ errors: validationErrors }, 400);
    }

    const updatedWorkflowData: WorkflowType = {
      id: existingWorkflow.id,
      name: data.name ?? existingWorkflow.name,
      handle: existingWorkflow.handle,
      nodes: sanitizedNodes,
      edges: Array.isArray(data.edges) ? data.edges : [],
    };

    const updatedWorkflow = await updateWorkflow(db, id, user.organization.id, {
      name: data.name,
      data: updatedWorkflowData,
      updatedAt: now,
    });

    const workflowDataFromDb = updatedWorkflow.data as WorkflowType;

    const response: UpdateWorkflowResponse = {
      id: updatedWorkflow.id,
      name: updatedWorkflow.name,
      handle: updatedWorkflow.handle,
      createdAt: updatedWorkflow.createdAt,
      updatedAt: updatedWorkflow.updatedAt,
      nodes: workflowDataFromDb.nodes || [],
      edges: workflowDataFromDb.edges || [],
    };

    return c.json(response);
  }
);

/**
 * DELETE /api/workflows/:id
 *
 * Delete a workflow by ID
 */
workflowRoutes.delete("/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const existingWorkflow = await getWorkflowById(db, id, user.organization.id);

  if (!existingWorkflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const deletedWorkflow = await deleteWorkflow(db, id, user.organization.id);

  if (!deletedWorkflow) {
    return c.json({ error: "Failed to delete workflow" }, 500);
  }

  const response: DeleteWorkflowResponse = { id: deletedWorkflow.id };
  return c.json(response);
});

/**
 * POST /api/workflows/:id/execute
 *
 * Execute a workflow by ID
 */
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
    if (c.req.raw.headers.get("content-type")?.includes("application/json")) {
      body = await c.req.json();
    }
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
        handle: workflow.handle,
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
  const nodeExecutions: NodeExecution[] = workflowData.nodes.map(
    (node: Node) => ({
      nodeId: node.id,
      status: "idle",
    })
  );

  // Map our API type status to DB-compatible status
  const idleStatus = ExecutionStatus.IDLE;

  // Ensure user.sub is not undefined
  const userId = user.sub || "anonymous";

  // Save initial execution record
  const initialExecution = await saveExecution(db, {
    id: executionId,
    workflowId: workflow.id,
    userId,
    organizationId: user.organization.id,
    status: idleStatus,
    nodeExecutions,
    visibility: "private",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const response: ExecuteWorkflowResponse = {
    id: initialExecution.id,
    workflowId: initialExecution.workflowId,
    status: "idle",
    nodeExecutions: initialExecution.nodeExecutions,
  };

  return c.json(response, 201);
});

export default workflowRoutes;
