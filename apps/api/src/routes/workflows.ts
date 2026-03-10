import {
  CancelWorkflowExecutionResponse,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  DeleteDiscordTriggerResponse,
  DeleteEndpointTriggerResponse,
  DeleteQueueTriggerResponse,
  DeleteTelegramTriggerResponse,
  DeleteWorkflowResponse,
  ExecuteWorkflowResponse,
  ExecutionStatus,
  GetDiscordTriggerResponse,
  GetEmailTriggerResponse,
  GetEndpointTriggerResponse,
  GetQueueTriggerResponse,
  GetTelegramTriggerResponse,
  GetWorkflowResponse,
  JWTTokenPayload,
  ListWorkflowsResponse,
  SyncDiscordTriggerResponse,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  UpsertEndpointTriggerRequest,
  UpsertEndpointTriggerResponse,
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
import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  createDatabase,
  createHandle,
  deleteDiscordTrigger as deleteDbDiscordTrigger,
  deleteEndpointTrigger as deleteDbEndpointTrigger,
  deleteQueueTrigger as deleteDbQueueTrigger,
  deleteTelegramTrigger as deleteDbTelegramTrigger,
  getDiscordBot,
  getDiscordTrigger,
  getEmailTrigger,
  getEndpoint,
  getEndpointTrigger,
  getOrganizationBillingInfo,
  getQueue,
  getQueueTrigger,
  getTelegramBot,
  getTelegramTrigger,
  getTelegramTriggersByBot,
  upsertEndpointTrigger as upsertDbEndpointTrigger,
  upsertQueueTrigger as upsertDbQueueTrigger,
  workflows,
} from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { CloudflareExecutionStore } from "../runtime/cloudflare-execution-store";
import { CloudflareNodeRegistry } from "../runtime/cloudflare-node-registry";
import { WorkflowExecutor } from "../services/workflow-executor";
import { WorkflowStore } from "../stores/workflow-store";
import { getAuthContext } from "../utils/auth-context";
import { decryptSecret } from "../utils/encryption";
import {
  isExecutionPreparationError,
  prepareWorkflowExecution,
} from "../utils/execution-preparation";
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
      trigger: workflow.trigger,
      runtime: workflow.runtime,
      enabled: workflow.enabled,
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
      trigger: z.string(),
      runtime: z.enum(["worker", "workflow"]).optional().default("workflow"),
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
      trigger: data.trigger,
      runtime: data.runtime || "workflow",
      nodes,
      edges,
    };

    const registry = new CloudflareNodeRegistry(c.env, false);
    const nodeTypes = registry.getNodeTypes();
    const validationErrors = validateWorkflow(workflowData, nodeTypes);
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
      trigger: workflowData.trigger,
      runtime: workflowData.runtime,
      organizationId: organizationId,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
      createdAt: now,
      updatedAt: now,
      apiHost: new URL(c.req.url).origin,
    });

    const response: CreateWorkflowResponse = {
      id: savedWorkflow.id,
      name: savedWorkflow.name,
      description: savedWorkflow.description,
      handle: savedWorkflow.handle,
      trigger: savedWorkflow.trigger,
      runtime: savedWorkflow.runtime,
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
      trigger: workflow.trigger,
      runtime: workflow.runtime,
      enabled: workflow.enabled,
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
      trigger: z.string().optional(),
      runtime: z.enum(["worker", "workflow"]).optional(),
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
      trigger: data.trigger || existingWorkflowData.trigger,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
    };
    const updateRegistry = new CloudflareNodeRegistry(c.env, false);
    const updateNodeTypes = updateRegistry.getNodeTypes();
    const validationErrors = validateWorkflow(
      workflowToValidate,
      updateNodeTypes
    );
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
      trigger: data.trigger || existingWorkflowData.trigger,
      runtime: data.runtime || existingWorkflow.runtime,
      organizationId: organizationId,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
      createdAt: existingWorkflow.createdAt,
      updatedAt: now,
      apiHost: new URL(c.req.url).origin,
    });

    const response: UpdateWorkflowResponse = {
      id: updatedWorkflowData.id,
      name: updatedWorkflowData.name,
      description: updatedWorkflowData.description ?? undefined,
      handle: updatedWorkflowData.handle,
      trigger: updatedWorkflowData.trigger,
      runtime: updatedWorkflowData.runtime,
      enabled: existingWorkflow.enabled,
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
  workflowData: any
): Promise<Response> {
  const db = createDatabase(c.env.DB);
  const { organizationId, userId, userPlan } = getAuthContext(c);

  // Get organization billing info
  const billingInfo = await getOrganizationBillingInfo(db, organizationId);
  if (!billingInfo) {
    return c.json({ error: "Organization not found" }, 404);
  }
  const { computeCredits, subscriptionStatus, overageLimit } = billingInfo;

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
      trigger: workflowData.trigger,
      runtime: workflowData.runtime,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    },
    userId,
    organizationId,
    computeCredits,
    subscriptionStatus: subscriptionStatus ?? undefined,
    overageLimit: overageLimit ?? null,
    parameters,
    userPlan,
    env: c.env,
  });

  // Return execution ID for all workflow types
  // Note: http_request workflows execute synchronously and are already complete
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
 * Requires the workflow to be enabled
 */
workflowRoutes.on(
  ["GET", "POST"],
  "/:workflowIdOrHandle/execute",
  jwtMiddleware,
  (c, next) => createRateLimitMiddleware(c.env.RATE_LIMIT_EXECUTE)(c, next),
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const { organizationId } = getAuthContext(c);

    const workflowStore = new WorkflowStore(c.env);

    // Load workflow with data
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

    // Require workflow to be enabled for prod execution
    if (!workflowWithData.enabled) {
      return c.json(
        {
          error:
            "Workflow is not enabled. Use /execute/dev for development or enable the workflow.",
        },
        400
      );
    }

    return executeWorkflow(c, workflowWithData, workflowWithData.data);
  }
);

/**
 * Execute a workflow in development mode (GET/POST)
 * Uses the working version from R2
 */
workflowRoutes.on(
  ["GET", "POST"],
  "/:workflowIdOrHandle/execute/dev",
  jwtMiddleware,
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

    return executeWorkflow(c, workflowWithData, workflowWithData.data);
  }
);

/**
 * Cancel a running workflow execution
 */
workflowRoutes.post(
  "/:workflowIdOrHandle/executions/:executionId/cancel",
  jwtMiddleware,
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const executionId = c.req.param("executionId");
    const executionStore = new CloudflareExecutionStore(c.env);

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

    if (workflow.trigger !== "queue_message") {
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
 * Get endpoint trigger for a workflow
 */
workflowRoutes.get(
  "/:workflowIdOrHandle/endpoint-trigger",
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

    const trigger = await getEndpointTrigger(db, workflow.id, organizationId);

    if (!trigger) {
      return c.json(
        { error: "Endpoint trigger not found for this workflow" },
        404
      );
    }

    const response: GetEndpointTriggerResponse = {
      workflowId: trigger.workflowId,
      endpointId: trigger.endpointId,
      active: trigger.active,
      createdAt: trigger.createdAt,
      updatedAt: trigger.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Upsert (create or update) an endpoint trigger for a workflow
 */
const UpsertEndpointTriggerRequestSchema = z.object({
  endpointId: z.string().min(1, "Endpoint ID is required"),
  active: z.boolean().optional(),
}) as z.ZodType<UpsertEndpointTriggerRequest>;

workflowRoutes.put(
  "/:workflowIdOrHandle/endpoint-trigger",
  jwtMiddleware,
  zValidator("json", UpsertEndpointTriggerRequestSchema),
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

    if (
      workflow.trigger !== "http_webhook" &&
      workflow.trigger !== "http_request"
    ) {
      return c.json({ error: "Workflow is not an HTTP trigger workflow" }, 400);
    }

    // Verify that the endpoint exists and belongs to the organization
    const endpoint = await getEndpoint(db, data.endpointId, organizationId);
    if (!endpoint) {
      return c.json({ error: "Endpoint not found" }, 404);
    }

    const now = new Date();
    const isActive = data.active ?? true;

    const trigger = await upsertDbEndpointTrigger(db, {
      workflowId: workflow.id,
      endpointId: data.endpointId,
      active: isActive,
      createdAt: now,
      updatedAt: now,
    });

    // Update workflow trigger type based on endpoint mode
    const triggerType =
      endpoint.mode === "request" ? "http_request" : "http_webhook";
    await db
      .update(workflows)
      .set({ trigger: triggerType, updatedAt: now })
      .where(
        and(
          eq(workflows.id, workflow.id),
          eq(workflows.organizationId, organizationId)
        )
      );

    const response: UpsertEndpointTriggerResponse = {
      workflowId: trigger.workflowId,
      endpointId: trigger.endpointId,
      active: trigger.active,
      createdAt: trigger.createdAt,
      updatedAt: trigger.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Delete endpoint trigger for a workflow
 */
workflowRoutes.delete(
  "/:workflowIdOrHandle/endpoint-trigger",
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

    const deletedTrigger = await deleteDbEndpointTrigger(
      db,
      workflow.id,
      organizationId
    );

    if (!deletedTrigger) {
      return c.json(
        { error: "Endpoint trigger not found for this workflow" },
        404
      );
    }

    const response: DeleteEndpointTriggerResponse = {
      workflowId: deletedTrigger.workflowId,
    };

    return c.json(response);
  }
);

/**
 * Get discord trigger for a workflow
 */
workflowRoutes.get(
  "/:workflowIdOrHandle/discord-trigger",
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

    const discordTrigger = await getDiscordTrigger(
      db,
      workflow.id,
      organizationId
    );

    if (!discordTrigger) {
      return c.json(
        { error: "Discord trigger not found for this workflow" },
        404
      );
    }

    const response: GetDiscordTriggerResponse = {
      workflowId: discordTrigger.workflowId,
      commandName: discordTrigger.commandName,
      commandDescription: discordTrigger.commandDescription,
      discordBotId: discordTrigger.discordBotId ?? null,
      active: discordTrigger.active,
      createdAt: discordTrigger.createdAt,
      updatedAt: discordTrigger.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Sync (re-register) the discord slash command for a workflow trigger
 */
workflowRoutes.post(
  "/:workflowIdOrHandle/discord-trigger/sync",
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

    const discordTrigger = await getDiscordTrigger(
      db,
      workflow.id,
      organizationId
    );
    if (!discordTrigger || !discordTrigger.discordBotId) {
      return c.json(
        { error: "Discord trigger not found for this workflow" },
        404
      );
    }

    const bot = await getDiscordBot(
      db,
      discordTrigger.discordBotId,
      organizationId
    );
    if (!bot) {
      return c.json({ error: "Discord bot not found" }, 404);
    }

    const botToken = await decryptSecret(
      bot.encryptedBotToken,
      c.env,
      organizationId
    );

    // Register the slash command with Discord
    const resp = await fetch(
      `https://discord.com/api/v10/applications/${bot.applicationId}/commands`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: discordTrigger.commandName,
          description: `Run the ${discordTrigger.commandName} workflow`,
          type: 1,
          options: [
            {
              name: "message",
              type: 3,
              description: "Input message for the workflow",
              required: false,
            },
          ],
        }),
      }
    );

    if (!resp.ok) {
      const body = await resp.text();
      console.error(
        `[DiscordTrigger] Sync failed for workflow=${workflow.id} command=${discordTrigger.commandName}: ${resp.status} ${body}`
      );
      return c.json(
        { error: `Failed to register slash command: ${body}` },
        502
      );
    }

    const response: SyncDiscordTriggerResponse = {
      commandName: discordTrigger.commandName,
      synced: true,
    };
    return c.json(response);
  }
);

/**
 * Delete a discord trigger for a workflow
 */
workflowRoutes.delete(
  "/:workflowIdOrHandle/discord-trigger",
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

    const deletedTrigger = await deleteDbDiscordTrigger(
      db,
      workflow.id,
      organizationId
    );

    if (!deletedTrigger) {
      return c.json(
        { error: "Discord trigger not found for this workflow" },
        404
      );
    }

    const response: DeleteDiscordTriggerResponse = {
      workflowId: deletedTrigger.workflowId,
    };
    return c.json(response);
  }
);

/**
 * Get telegram trigger for a workflow
 */
workflowRoutes.get(
  "/:workflowIdOrHandle/telegram-trigger",
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

    const telegramTrigger = await getTelegramTrigger(
      db,
      workflow.id,
      organizationId
    );

    if (!telegramTrigger) {
      return c.json(
        { error: "Telegram trigger not found for this workflow" },
        404
      );
    }

    const response: GetTelegramTriggerResponse = {
      workflowId: telegramTrigger.workflowId,
      chatId: telegramTrigger.chatId,
      telegramBotId: telegramTrigger.telegramBotId ?? null,
      active: telegramTrigger.active,
      createdAt: telegramTrigger.createdAt,
      updatedAt: telegramTrigger.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Delete a telegram trigger for a workflow
 */
workflowRoutes.delete(
  "/:workflowIdOrHandle/telegram-trigger",
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

    const deletedTrigger = await deleteDbTelegramTrigger(
      db,
      workflow.id,
      organizationId
    );

    if (!deletedTrigger) {
      return c.json(
        { error: "Telegram trigger not found for this workflow" },
        404
      );
    }

    // Check if there are other triggers for this bot — if not, unregister webhook
    const remainingTriggers = deletedTrigger.telegramBotId
      ? await getTelegramTriggersByBot(db, deletedTrigger.telegramBotId)
      : [];
    if (remainingTriggers.length === 0) {
      // Resolve the per-bot token for webhook cleanup
      let cleanupToken: string | undefined;
      if (deletedTrigger.telegramBotId) {
        try {
          const bot = await getTelegramBot(
            db,
            deletedTrigger.telegramBotId,
            organizationId
          );
          if (bot) {
            cleanupToken = await decryptSecret(
              bot.encryptedBotToken,
              c.env,
              organizationId
            );
          }
        } catch {
          // Bot may have been deleted already (ON DELETE SET NULL); webhook becomes stale harmlessly
        }
      }
      if (cleanupToken) {
        try {
          await fetch(
            `https://api.telegram.org/bot${cleanupToken}/deleteWebhook`,
            { method: "POST" }
          );
        } catch (error) {
          console.error(
            "[TelegramTrigger] Failed to unregister webhook:",
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }

    const response: DeleteTelegramTriggerResponse = {
      workflowId: deletedTrigger.workflowId,
    };
    return c.json(response);
  }
);

/**
 * Toggle workflow enabled state
 */
workflowRoutes.patch(
  "/:workflowIdOrHandle/enabled",
  jwtMiddleware,
  zValidator(
    "json",
    z.object({
      enabled: z.boolean(),
    })
  ),
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const organizationId = c.get("organizationId")!;
    const { enabled } = c.req.valid("json");

    const workflowStore = new WorkflowStore(c.env);
    const db = createDatabase(c.env.DB);

    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    try {
      await db
        .update(workflows)
        .set({
          enabled,
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
        enabled,
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
