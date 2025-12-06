import {
  CancelWorkflowExecutionResponse,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  DeleteQueueTriggerResponse,
  DeleteWorkflowResponse,
  ExecuteWorkflowResponse,
  ExecutionStatus,
  GetEmailTriggerResponse,
  GetQueueTriggerResponse,
  GetWorkflowResponse,
  JWTTokenPayload,
  ListWorkflowsResponse,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  UpsertQueueTriggerRequest,
  UpsertQueueTriggerResponse,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  createDatabase,
  createHandle,
  deleteQueueTrigger as deleteDbQueueTrigger,
  getEmailTrigger,
  getOrganizationComputeCredits,
  getQueue,
  getQueueTrigger,
  upsertQueueTrigger as upsertDbQueueTrigger,
  workflows,
} from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { WorkflowExecutor } from "../services/workflow-executor";
import { DeploymentStore } from "../stores/deployment-store";
import { ExecutionStore } from "../stores/execution-store";
import { WorkflowStore } from "../stores/workflow-store";
import { getAuthContext } from "../utils/auth-context";
import {
  isExecutionPreparationError,
  prepareWorkflowExecution,
} from "../utils/execution-preparation";
import { waitForSyncHttpResponse } from "../utils/sync-http-execution";
import { validateWorkflow } from "../utils/workflows";

// Extend the ApiContext with our custom variable
type ExtendedApiContext = ApiContext & {
  Variables: {
    jwtPayload?: JWTTokenPayload;
    organizationId?: string;
  };
};

const workflowRoutes = new Hono<ExtendedApiContext>();

/**
 * List all workflows for the current organization
 */
workflowRoutes.get("/", jwtMiddleware, async (c) => {
  const workflowStore = new WorkflowStore(c.env);

  const organizationId = c.get("organizationId")!;

  const allWorkflows = await workflowStore.list(organizationId);

  // Convert DB workflow objects to WorkflowWithMetadata objects
  const workflows: WorkflowWithMetadata[] = allWorkflows.map((workflow) => {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description ?? undefined,
      handle: workflow.handle,
      type: workflow.type,
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
 * Create a new workflow for the current organization
 */
workflowRoutes.post(
  "/",
  jwtMiddleware,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Workflow name is required"),
      description: z.string().optional(),
      type: z.string(),
      nodes: z.array(z.any()).optional(),
      edges: z.array(z.any()).optional(),
    }) as z.ZodType<CreateWorkflowRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const now = new Date();

    const organizationId = c.get("organizationId")!;

    const workflowId = uuid();
    const workflowName = data.name || "Untitled Workflow";
    const workflowHandle = createHandle(workflowName);

    const nodes = Array.isArray(data.nodes) ? data.nodes : [];

    // Filter out orphaned edges
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const edges = Array.isArray(data.edges)
      ? data.edges.filter(
          (edge: any) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
        )
      : [];

    const workflowData = {
      id: workflowId,
      name: workflowName,
      handle: workflowHandle,
      type: data.type,
      nodes,
      edges,
    };

    const validationErrors = validateWorkflow(workflowData);
    if (validationErrors.length > 0) {
      return c.json({ errors: validationErrors }, 400);
    }

    // Save workflow to both D1 and R2
    const workflowStore = new WorkflowStore(c.env);

    const savedWorkflow = await workflowStore.save({
      id: workflowData.id,
      name: workflowData.name,
      description: data.description,
      handle: workflowData.handle,
      type: workflowData.type,
      organizationId: organizationId,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateWorkflowResponse = {
      id: savedWorkflow.id,
      name: savedWorkflow.name,
      description: savedWorkflow.description,
      handle: savedWorkflow.handle,
      type: savedWorkflow.type,
      createdAt: now,
      updatedAt: now,
      nodes: savedWorkflow.nodes,
      edges: savedWorkflow.edges,
    };

    return c.json(response, 201);
  }
);

/**
 * Get a specific workflow by ID
 */
workflowRoutes.get("/:id", jwtMiddleware, async (c) => {
  const id = c.req.param("id");
  const organizationId = c.get("organizationId")!;
  const userId = c.var.jwtPayload?.sub;

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const workflowStore = new WorkflowStore(c.env);

  try {
    const workflow = await workflowStore.getWithData(id, organizationId);

    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const response: GetWorkflowResponse = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description ?? undefined,
      handle: workflow.handle,
      type: workflow.type,
      createdAt: workflow.createdAt || new Date(),
      updatedAt: workflow.updatedAt || new Date(),
      nodes: workflow.data.nodes || [],
      edges: workflow.data.edges || [],
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return c.json({ error: "Failed to fetch workflow" }, 500);
  }
});

/**
 * Update a workflow by ID
 */
workflowRoutes.put(
  "/:id",
  jwtMiddleware,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Workflow name is required"),
      description: z.string().optional(),
      type: z.string().optional(),
      nodes: z.array(z.any()).optional(),
      edges: z.array(z.any()).optional(),
    }) as z.ZodType<UpdateWorkflowRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const workflowStore = new WorkflowStore(c.env);

    const organizationId = c.get("organizationId")!;

    const existingWorkflow = await workflowStore.getWithData(
      id,
      organizationId
    );

    if (!existingWorkflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();
    const existingWorkflowData = existingWorkflow.data;

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
      : existingWorkflowData.nodes;

    // Filter out orphaned edges (defensive: edges referencing non-existent nodes)
    const nodeIds = new Set(sanitizedNodes.map((n: any) => n.id));
    const sanitizedEdges = Array.isArray(data.edges)
      ? data.edges.filter(
          (edge: any) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
        )
      : existingWorkflowData.edges;

    const workflowToValidate = {
      id: existingWorkflow.id,
      name: data.name ?? existingWorkflow.name,
      handle: existingWorkflow.handle,
      type: data.type || existingWorkflowData.type,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
    };
    const validationErrors = validateWorkflow(workflowToValidate);
    if (validationErrors.length > 0) {
      return c.json({ errors: validationErrors }, 400);
    }

    // Save updated workflow to both D1 and R2
    const updatedWorkflowData = await workflowStore.save({
      id: existingWorkflow.id,
      name: data.name ?? existingWorkflow.name,
      description:
        data.description ?? existingWorkflow.description ?? undefined,
      handle: existingWorkflow.handle,
      type: data.type || existingWorkflowData.type,
      organizationId: organizationId,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
      createdAt: existingWorkflow.createdAt,
      updatedAt: now,
    });

    const response: UpdateWorkflowResponse = {
      id: updatedWorkflowData.id,
      name: updatedWorkflowData.name,
      description: updatedWorkflowData.description ?? undefined,
      handle: updatedWorkflowData.handle,
      type: updatedWorkflowData.type,
      createdAt: existingWorkflow.createdAt,
      updatedAt: now,
      nodes: updatedWorkflowData.nodes || [],
      edges: updatedWorkflowData.edges || [],
    };

    return c.json(response);
  }
);

/**
 * Delete a workflow by ID
 */
workflowRoutes.delete("/:id", jwtMiddleware, async (c) => {
  const id = c.req.param("id");
  const workflowStore = new WorkflowStore(c.env);

  const organizationId = c.get("organizationId")!;

  const deletedWorkflow = await workflowStore.delete(id, organizationId);

  if (!deletedWorkflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const response: DeleteWorkflowResponse = { id: deletedWorkflow.id };
  return c.json(response);
});

/**
 * Shared workflow execution logic
 */
async function executeWorkflow(
  c: Context<ExtendedApiContext>,
  workflow: { id: string; name: string; handle: string },
  workflowData: any,
  deploymentId: string | undefined
): Promise<Response> {
  const db = createDatabase(c.env.DB);
  const { organizationId, userId } = getAuthContext(c);

  // Get organization compute credits
  const computeCredits = await getOrganizationComputeCredits(
    db,
    organizationId
  );
  if (computeCredits === undefined) {
    return c.json({ error: "Organization not found" }, 404);
  }

  // Prepare workflow for execution
  const preparationResult = await prepareWorkflowExecution(c, workflowData);
  if (isExecutionPreparationError(preparationResult)) {
    return c.json({ error: preparationResult.error }, preparationResult.status);
  }

  const { parameters } = preparationResult;

  // Execute workflow
  const { execution } = await WorkflowExecutor.execute({
    workflow: {
      id: workflow.id,
      name: workflow.name,
      handle: workflow.handle,
      type: workflowData.type,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    },
    userId,
    organizationId,
    computeCredits,
    deploymentId,
    parameters,
    env: c.env,
  });

  // For synchronous HTTP Request workflows, wait for response
  if (workflowData.type === "http_request") {
    const syncResult = await waitForSyncHttpResponse(
      execution.id,
      organizationId,
      c.env,
      10000 // 10 second timeout
    );

    if (syncResult.timeout) {
      return c.json({ error: "Request timeout" }, 504);
    }

    if (!syncResult.success) {
      return c.json(
        { error: syncResult.error || "Workflow execution failed" },
        500
      );
    }

    return new Response(syncResult.body, {
      status: syncResult.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  // For async workflows, return execution ID immediately
  const response: ExecuteWorkflowResponse = {
    id: execution.id,
    workflowId: execution.workflowId,
    status: execution.status,
    nodeExecutions: execution.nodeExecutions,
  };

  return c.json(response, 201);
}

/**
 * Execute a workflow in production mode (GET/POST)
 * Uses the active deployment
 */
workflowRoutes.on(
  ["GET", "POST"],
  "/:workflowIdOrHandle/execute",
  apiKeyOrJwtMiddleware,
  (c, next) => createRateLimitMiddleware(c.env.RATE_LIMIT_EXECUTE)(c, next),
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const { organizationId } = getAuthContext(c);

    const workflowStore = new WorkflowStore(c.env);
    const deploymentStore = new DeploymentStore(c.env);

    // Get workflow metadata
    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    // Require active deployment for prod
    if (!workflow.activeDeploymentId) {
      return c.json(
        {
          error:
            "No active deployment set for this workflow. Use /execute/dev for development or set an active deployment.",
        },
        400
      );
    }

    // Load workflow data from deployment snapshot
    let workflowData: any;
    try {
      workflowData = await deploymentStore.readWorkflowSnapshot(
        workflow.activeDeploymentId
      );
    } catch (error) {
      return c.json(
        {
          error: `Failed to load active deployment: ${error instanceof Error ? error.message : String(error)}`,
        },
        500
      );
    }

    return executeWorkflow(
      c,
      workflow,
      workflowData,
      workflow.activeDeploymentId
    );
  }
);

/**
 * Execute a workflow in development mode (GET/POST)
 * Uses the working version from R2
 */
workflowRoutes.on(
  ["GET", "POST"],
  "/:workflowIdOrHandle/execute/dev",
  apiKeyOrJwtMiddleware,
  (c, next) => createRateLimitMiddleware(c.env.RATE_LIMIT_EXECUTE)(c, next),
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const { organizationId } = getAuthContext(c);

    const workflowStore = new WorkflowStore(c.env);

    // Load workflow with data from working version
    let workflowWithData;
    try {
      workflowWithData = await workflowStore.getWithData(
        workflowIdOrHandle,
        organizationId
      );
    } catch (error) {
      return c.json(
        {
          error: `Failed to load workflow: ${error instanceof Error ? error.message : String(error)}`,
        },
        500
      );
    }

    if (!workflowWithData || !workflowWithData.data) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    return executeWorkflow(
      c,
      workflowWithData,
      workflowWithData.data,
      undefined
    );
  }
);

/**
 * Cancel a running workflow execution
 */
workflowRoutes.post(
  "/:workflowIdOrHandle/executions/:executionId/cancel",
  apiKeyOrJwtMiddleware,
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const executionId = c.req.param("executionId");
    const executionStore = new ExecutionStore(c.env);

    // Get the execution to verify it exists and belongs to this organization
    const execution = await executionStore.getWithData(
      executionId,
      organizationId
    );
    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    // Only allow cancellation of submitted or executing workflows
    if (!["submitted", "executing"].includes(execution.status)) {
      return c.json(
        {
          error: `Cannot cancel execution in status: ${execution.status}`,
        },
        400
      );
    }

    const executionData = execution.data;

    try {
      // Get the workflow instance and terminate it
      const instance = await c.env.EXECUTE.get(executionId);
      await instance.terminate();

      // Update the execution status in the database
      const now = new Date();
      const updatedExecution = await executionStore.save({
        id: executionId,
        workflowId: execution.workflowId,
        deploymentId: execution.deploymentId ?? undefined,
        userId: "cancelled", // Required by SaveExecutionRecord but not stored in DB
        organizationId: execution.organizationId,
        status: ExecutionStatus.CANCELLED,
        nodeExecutions: executionData.nodeExecutions || [],
        error: execution.error ?? "Execution cancelled by user",
        updatedAt: now,
        endedAt: now,
        startedAt: execution.startedAt ?? undefined,
      });

      const response: CancelWorkflowExecutionResponse = {
        id: updatedExecution.id,
        status: "cancelled",
        message: "Execution cancelled successfully",
      };
      return c.json(response);
    } catch (error) {
      console.error("Error cancelling execution:", error);

      // If the instance doesn't exist or can't be terminated, still update the database
      const now = new Date();
      await executionStore.save({
        id: executionId,
        workflowId: execution.workflowId,
        deploymentId: execution.deploymentId ?? undefined,
        userId: "cancelled", // Required by SaveExecutionRecord but not stored in DB
        organizationId: execution.organizationId,
        status: ExecutionStatus.CANCELLED,
        nodeExecutions: executionData.nodeExecutions || [],
        error: execution.error ?? "Execution cancelled by user",
        updatedAt: now,
        endedAt: now,
        startedAt: execution.startedAt ?? undefined,
      });

      const response: CancelWorkflowExecutionResponse = {
        id: executionId,
        status: "cancelled",
        message: "Execution cancelled (instance may have already completed)",
      };
      return c.json(response);
    }
  }
);

/**
 * Get queue trigger for a workflow
 */
workflowRoutes.get(
  "/:workflowIdOrHandle/queue-trigger",
  jwtMiddleware,
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const organizationId = c.get("organizationId")!;
    const workflowStore = new WorkflowStore(c.env);
    const db = createDatabase(c.env.DB);

    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const queueTrigger = await getQueueTrigger(db, workflow.id, organizationId);

    if (!queueTrigger) {
      return c.json(
        { error: "Queue trigger not found for this workflow" },
        404
      );
    }

    // Map the DB row to GetQueueTriggerResponse
    const response: GetQueueTriggerResponse = {
      workflowId: queueTrigger.workflowId,
      queueId: queueTrigger.queueId,
      active: queueTrigger.active,
      createdAt: queueTrigger.createdAt,
      updatedAt: queueTrigger.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Upsert (create or update) a queue trigger for a workflow
 */
const UpsertQueueTriggerRequestSchema = z.object({
  queueId: z.string().min(1, "Queue ID is required"),
  active: z.boolean().optional(),
}) as z.ZodType<UpsertQueueTriggerRequest>;

workflowRoutes.put(
  "/:workflowIdOrHandle/queue-trigger",
  jwtMiddleware,
  zValidator("json", UpsertQueueTriggerRequestSchema),
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const organizationId = c.get("organizationId")!;
    const data = c.req.valid("json");
    const db = createDatabase(c.env.DB);
    const workflowStore = new WorkflowStore(c.env);

    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    if (workflow.type !== "queue_message") {
      return c.json({ error: "Workflow is not a queue message workflow" }, 400);
    }

    // Verify that the queue exists and belongs to the organization
    const queue = await getQueue(db, data.queueId, organizationId);
    if (!queue) {
      return c.json({ error: "Queue not found" }, 404);
    }

    const now = new Date();
    const isActive = data.active ?? true;

    try {
      const upsertedQueueTrigger = await upsertDbQueueTrigger(db, {
        workflowId: workflow.id,
        queueId: queue.id,
        active: isActive,
        updatedAt: now,
      });

      if (!upsertedQueueTrigger) {
        return c.json(
          { error: "Failed to create or update queue trigger" },
          500
        );
      }

      const response: UpsertQueueTriggerResponse = {
        ...upsertedQueueTrigger,
      };
      return c.json(response, 200);
    } catch (dbError: any) {
      console.error("Error upserting queue trigger:", dbError);
      return c.json(
        {
          error: "Database error while saving queue trigger",
          details: dbError.message,
        },
        500
      );
    }
  }
);

/**
 * Delete a queue trigger for a workflow
 */
workflowRoutes.delete(
  "/:workflowIdOrHandle/queue-trigger",
  jwtMiddleware,
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const organizationId = c.get("organizationId")!;
    const workflowStore = new WorkflowStore(c.env);
    const db = createDatabase(c.env.DB);

    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const deletedTrigger = await deleteDbQueueTrigger(
      db,
      workflow.id,
      organizationId
    );

    if (!deletedTrigger) {
      return c.json(
        { error: "Queue trigger not found for this workflow" },
        404
      );
    }

    const response: DeleteQueueTriggerResponse = {
      workflowId: deletedTrigger.workflowId,
    };
    return c.json(response);
  }
);

/**
 * Get email trigger for a workflow
 */
workflowRoutes.get(
  "/:workflowIdOrHandle/email-trigger",
  jwtMiddleware,
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const organizationId = c.get("organizationId")!;
    const workflowStore = new WorkflowStore(c.env);
    const db = createDatabase(c.env.DB);

    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const emailTrigger = await getEmailTrigger(db, workflow.id, organizationId);

    if (!emailTrigger) {
      return c.json(
        { error: "Email trigger not found for this workflow" },
        404
      );
    }

    // Map the DB row to GetEmailTriggerResponse
    const response: GetEmailTriggerResponse = {
      workflowId: emailTrigger.workflowId,
      emailId: emailTrigger.emailId,
      active: emailTrigger.active,
      createdAt: emailTrigger.createdAt,
      updatedAt: emailTrigger.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Get active deployment for a workflow
 */
workflowRoutes.get(
  "/:workflowIdOrHandle/active-deployment",
  jwtMiddleware,
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const organizationId = c.get("organizationId")!;
    const workflowStore = new WorkflowStore(c.env);

    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    if (!workflow.activeDeploymentId) {
      return c.json({
        activeDeploymentId: null,
        message: "No active deployment set (using dev version)",
      });
    }

    // Get deployment details
    const deploymentStore = new DeploymentStore(c.env);
    try {
      const deployment = await deploymentStore.get(
        workflow.activeDeploymentId,
        organizationId
      );

      if (!deployment) {
        // Active deployment reference exists but deployment not found
        // This shouldn't happen but handle gracefully
        return c.json(
          {
            error:
              "Active deployment reference exists but deployment not found",
            activeDeploymentId: workflow.activeDeploymentId,
          },
          500
        );
      }

      return c.json({
        activeDeploymentId: deployment.id,
        version: deployment.version,
        createdAt: deployment.createdAt,
      });
    } catch (error) {
      return c.json(
        {
          error: `Failed to fetch deployment: ${error instanceof Error ? error.message : String(error)}`,
        },
        500
      );
    }
  }
);

/**
 * Set or clear active deployment for a workflow
 */
workflowRoutes.patch(
  "/:workflowIdOrHandle/active-deployment",
  jwtMiddleware,
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const organizationId = c.get("organizationId")!;
    const body = await c.req.json();
    const deploymentId = body.deploymentId as string | null;

    const workflowStore = new WorkflowStore(c.env);
    const db = createDatabase(c.env.DB);

    // Get workflow
    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    // If deploymentId is provided, verify it exists and belongs to this workflow
    if (deploymentId) {
      const deploymentStore = new DeploymentStore(c.env);
      const deployment = await deploymentStore.get(
        deploymentId,
        organizationId
      );

      if (!deployment) {
        return c.json({ error: "Deployment not found" }, 404);
      }

      if (deployment.workflowId !== workflow.id) {
        return c.json(
          { error: "Deployment does not belong to this workflow" },
          400
        );
      }
    }

    // Update workflow's activeDeploymentId
    try {
      await db
        .update(workflows)
        .set({
          activeDeploymentId: deploymentId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workflows.id, workflow.id),
            eq(workflows.organizationId, organizationId)
          )
        );

      return c.json({
        workflowId: workflow.id,
        activeDeploymentId: deploymentId,
        message: deploymentId
          ? `Active deployment set to ${deploymentId}`
          : "Active deployment cleared (using dev version)",
      });
    } catch (error) {
      return c.json(
        {
          error: `Failed to update workflow: ${error instanceof Error ? error.message : String(error)}`,
        },
        500
      );
    }
  }
);

export default workflowRoutes;
