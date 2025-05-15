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
  getLatestDeploymentByWorkflowId,
  getDeploymentByVersion,
} from "../utils/db";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { executeWorkflow } from "../utils/executions";

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
 * POST /api/workflows/:id/execute/dev
 * Execute a workflow in development mode
 */
workflowRoutes.post("/:id/execute/dev", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const monitorProgress = new URL(c.req.url).searchParams.get("monitorProgress") === "true";

  const result = await executeWorkflow({
    c,
    workflowId: id,
    userId: user.sub || "anonymous",
    organizationId: user.organization.id,
    monitorProgress,
  });

  if (result.error) {
    return c.json({ error: result.error }, result.status as 400 | 404);
  }

  if (!result.execution) {
    return c.json({ error: "Failed to create execution" }, 500);
  }

  const response: ExecuteWorkflowResponse = {
    id: result.execution.id,
    workflowId: result.execution.workflowId,
    status: "executing",
    nodeExecutions: result.execution.nodeExecutions,
  };

  return c.json(response, result.status as 201);
});

/**
 * POST /api/workflows/:id/execute/latest
 * Execute the latest deployment of a workflow
 */
workflowRoutes.post("/:id/execute/latest", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const monitorProgress = new URL(c.req.url).searchParams.get("monitorProgress") === "true";
  const db = createDatabase(c.env.DB);

  // Get the latest deployment
  const latestDeployment = await getLatestDeploymentByWorkflowId(db, id, user.organization.id);
  if (!latestDeployment) {
    return c.json({ error: "No deployments found for this workflow" }, 404);
  }

  const result = await executeWorkflow({
    c,
    workflowId: id,
    deploymentId: latestDeployment.id,
    userId: user.sub || "anonymous",
    organizationId: user.organization.id,
    monitorProgress,
  });

  if (result.error) {
    return c.json({ error: result.error }, result.status as 400 | 404);
  }

  if (!result.execution) {
    return c.json({ error: "Failed to create execution" }, 500);
  }

  const response: ExecuteWorkflowResponse = {
    id: result.execution.id,
    workflowId: result.execution.workflowId,
    status: "executing",
    nodeExecutions: result.execution.nodeExecutions,
  };

  return c.json(response, result.status as 201);
});

/**
 * POST /api/workflows/:id/execute/:version
 * Execute a specific version of a workflow
 */
workflowRoutes.post("/:id/execute/:version", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const version = c.req.param("version");
  const monitorProgress = new URL(c.req.url).searchParams.get("monitorProgress") === "true";
  const db = createDatabase(c.env.DB);

  // Get the deployment for this version
  const deployment = await getDeploymentByVersion(db, id, version, user.organization.id);
  if (!deployment) {
    return c.json({ error: "Deployment version not found" }, 404);
  }

  const result = await executeWorkflow({
    c,
    workflowId: id,
    deploymentId: deployment.id,
    userId: user.sub || "anonymous",
    organizationId: user.organization.id,
    monitorProgress,
  });

  if (result.error) {
    return c.json({ error: result.error }, result.status as 400 | 404);
  }

  if (!result.execution) {
    return c.json({ error: "Failed to create execution" }, 500);
  }

  const response: ExecuteWorkflowResponse = {
    id: result.execution.id,
    workflowId: result.execution.workflowId,
    status: "executing",
    nodeExecutions: result.execution.nodeExecutions,
  };

  return c.json(response, result.status as 201);
});

export default workflowRoutes;
