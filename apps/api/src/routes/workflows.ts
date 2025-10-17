import {
  CancelWorkflowExecutionResponse,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  DeleteWorkflowResponse,
  ExecuteWorkflowResponse,
  GetCronTriggerResponse,
  GetWorkflowResponse,
  ListWorkflowsResponse,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  UpsertCronTriggerRequest,
  UpsertCronTriggerResponse,
  VersionAlias,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import { JWTTokenPayload } from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import CronParser from "cron-parser";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  createDatabase,
  createHandle,
  ExecutionStatus,
  getCronTrigger,
  getOrganizationComputeCredits,
  upsertCronTrigger as upsertDbCronTrigger,
} from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { DeploymentStore } from "../runtime/deployment-store";
import { ExecutionStore } from "../runtime/execution-store";
import { WorkflowStore } from "../runtime/workflow-store";
import { WorkflowExecutor } from "../services/workflow-executor";
import { getAuthContext } from "../utils/auth-context";
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
  const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);

  const organizationId = c.get("organizationId")!;

  const allWorkflows = await workflowStore.list(organizationId);

  // Convert DB workflow objects to WorkflowWithMetadata objects
  const workflows: WorkflowWithMetadata[] = allWorkflows.map((workflow) => {
    return {
      id: workflow.id,
      name: workflow.name,
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

    const workflowData = {
      id: workflowId,
      name: workflowName,
      handle: workflowHandle,
      type: data.type,
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
    };

    const validationErrors = validateWorkflow(workflowData);
    if (validationErrors.length > 0) {
      return c.json({ errors: validationErrors }, 400);
    }

    // Save workflow to both D1 and R2
    const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);

    const savedWorkflow = await workflowStore.save({
      id: workflowData.id,
      name: workflowData.name,
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

  const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);

  try {
    const workflow = await workflowStore.getWithData(id, organizationId);

    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const response: GetWorkflowResponse = {
      id: workflow.id,
      name: workflow.name,
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
      type: z.string().optional(),
      nodes: z.array(z.any()).optional(),
      edges: z.array(z.any()).optional(),
    }) as z.ZodType<UpdateWorkflowRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);

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

    const workflowToValidate = {
      id: existingWorkflow.id,
      name: data.name ?? existingWorkflow.name,
      handle: existingWorkflow.handle,
      type: data.type || existingWorkflowData.type,
      nodes: sanitizedNodes,
      edges: Array.isArray(data.edges)
        ? data.edges
        : existingWorkflowData.edges,
    };
    const validationErrors = validateWorkflow(workflowToValidate);
    if (validationErrors.length > 0) {
      return c.json({ errors: validationErrors }, 400);
    }

    // Save updated workflow to both D1 and R2
    const updatedWorkflowData = await workflowStore.save({
      id: existingWorkflow.id,
      name: data.name ?? existingWorkflow.name,
      handle: existingWorkflow.handle,
      type: data.type || existingWorkflowData.type,
      organizationId: organizationId,
      nodes: sanitizedNodes,
      edges: Array.isArray(data.edges)
        ? data.edges
        : existingWorkflowData.edges,
      createdAt: existingWorkflow.createdAt,
      updatedAt: now,
    });

    const response: UpdateWorkflowResponse = {
      id: updatedWorkflowData.id,
      name: updatedWorkflowData.name,
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
  const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);

  const organizationId = c.get("organizationId")!;

  const deletedWorkflow = await workflowStore.delete(id, organizationId);

  if (!deletedWorkflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const response: DeleteWorkflowResponse = { id: deletedWorkflow.id };
  return c.json(response);
});

/**
 * Get cron trigger for a workflow
 */
workflowRoutes.get("/:workflowIdOrHandle/cron", jwtMiddleware, async (c) => {
  const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
  const organizationId = c.get("organizationId")!;
  const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);
  const db = createDatabase(c.env.DB);

  const workflow = await workflowStore.get(workflowIdOrHandle, organizationId);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const cron = await getCronTrigger(db, workflow.id, organizationId);

  if (!cron) {
    return c.json({ error: "Cron trigger not found for this workflow" }, 404);
  }

  // Map the DB row to GetCronTriggerResponse
  const response: GetCronTriggerResponse = {
    workflowId: cron.workflowId,
    cronExpression: cron.cronExpression,
    versionAlias: cron.versionAlias as VersionAlias,
    versionNumber: cron.versionNumber,
    active: cron.active,
    nextRunAt: cron.nextRunAt,
    createdAt: cron.createdAt,
    updatedAt: cron.updatedAt,
  };

  return c.json(response);
});

/**
 * Upsert (create or update) a cron trigger for a workflow
 */
const UpsertCronTriggerRequestSchema = z.object({
  cronExpression: z.string().min(1, "Cron expression is required"),
  versionAlias: z.enum(["dev", "latest", "version"]).optional(),
  versionNumber: z.number().optional().nullable(),
  active: z.boolean().optional(),
}) as z.ZodType<UpsertCronTriggerRequest>;

workflowRoutes.put(
  "/:workflowIdOrHandle/cron",
  jwtMiddleware,
  zValidator("json", UpsertCronTriggerRequestSchema),
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const organizationId = c.get("organizationId")!;
    const data = c.req.valid("json");
    const db = createDatabase(c.env.DB);
    const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);

    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    if (workflow.type !== "cron") {
      return c.json({ error: "Workflow is not a cron workflow" }, 400);
    }

    if (data.versionAlias === "version" && !data.versionNumber) {
      return c.json(
        { error: "versionNumber is required when versionAlias is 'version'" },
        400
      );
    }

    const now = new Date();
    const isActive = data.active ?? true;
    let nextRunAt: Date | null = null;

    if (isActive) {
      try {
        const interval = CronParser.parse(data.cronExpression, {
          currentDate: now,
        });
        nextRunAt = interval.next().toDate();
      } catch (e: any) {
        return c.json(
          { error: "Invalid cron expression", details: e.message },
          400
        );
      }
    }

    try {
      const upsertedCron = await upsertDbCronTrigger(db, {
        workflowId: workflow.id,
        cronExpression: data.cronExpression,
        active: isActive,
        nextRunAt: nextRunAt,
        updatedAt: now,
        versionAlias: data.versionAlias,
        versionNumber:
          data.versionAlias === "version" ? data.versionNumber : null,
      });

      if (!upsertedCron) {
        return c.json(
          { error: "Failed to create or update cron trigger" },
          500
        );
      }

      const response: UpsertCronTriggerResponse = {
        ...upsertedCron,
        versionAlias: upsertedCron.versionAlias as VersionAlias,
      };
      return c.json(response, 200);
    } catch (dbError: any) {
      console.error("Error upserting cron trigger:", dbError);
      return c.json(
        {
          error: "Database error while saving cron trigger",
          details: dbError.message,
        },
        500
      );
    }
  }
);

/**
 * Execute a workflow with the specified version
 * - version can be "dev" for development mode
 * - version can be "latest" for the latest deployment
 * - version can be a number for a specific deployment version
 */
workflowRoutes.post(
  "/:workflowIdOrHandle/execute/:version",
  apiKeyOrJwtMiddleware,
  (c, next) => createRateLimitMiddleware(c.env.RATE_LIMIT_EXECUTE)(c, next),
  async (c) => {
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const version = c.req.param("version");
    const db = createDatabase(c.env.DB);

    // Get auth context from either JWT or API key
    const { organizationId, userId } = getAuthContext(c);

    // Get organization compute credits
    const computeCredits = await getOrganizationComputeCredits(
      db,
      organizationId
    );
    if (computeCredits === undefined) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Get workflow data either from deployment or directly from workflow
    let workflowData: any;
    let workflow: any;
    let deploymentId: string | undefined;
    const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);
    const deploymentStore = new DeploymentStore(c.env.DB, c.env.RESSOURCES);

    if (version === "dev") {
      // Load workflow with data from database and R2
      const workflowWithData = await workflowStore.getWithData(
        workflowIdOrHandle,
        organizationId
      );
      if (!workflowWithData) {
        return c.json({ error: "Workflow not found" }, 404);
      }

      workflow = workflowWithData;
      workflowData = workflowWithData.data;
    } else {
      // Get deployment based on version
      let deployment: any;
      if (version === "latest") {
        deployment = await deploymentStore.getLatest(
          workflowIdOrHandle,
          organizationId
        );
        if (!deployment) {
          return c.json(
            { error: "No deployments found for this workflow" },
            404
          );
        }
      } else {
        deployment = await deploymentStore.getByVersion(
          workflowIdOrHandle,
          organizationId,
          version
        );
        if (!deployment) {
          return c.json({ error: "Deployment version not found" }, 404);
        }
      }

      deploymentId = deployment.id;

      // Load deployment workflow snapshot from R2
      workflowData = await deploymentStore.readWorkflowSnapshot(deployment.id);

      workflow = {
        id: deployment.workflowId,
        name: workflowData.name,
        handle: workflowData.handle,
        type: workflowData.type,
      };
    }

    // Prepare workflow for execution
    const preparationResult = await prepareWorkflowExecution(c, workflowData);
    if (isExecutionPreparationError(preparationResult)) {
      return c.json(
        { error: preparationResult.error },
        preparationResult.status
      );
    }

    const { parameters } = preparationResult;

    // Execute workflow using shared service
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

    const response: ExecuteWorkflowResponse = {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      nodeExecutions: execution.nodeExecutions,
    };

    return c.json(response, 201);
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
    const executionStore = new ExecutionStore(c.env.DB, c.env.RESSOURCES);

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

export default workflowRoutes;
