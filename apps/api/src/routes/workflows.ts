import {
  CancelWorkflowExecutionResponse,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  DeleteWorkflowResponse,
  ExecuteWorkflowResponse,
  GetWorkflowResponse,
  ListWorkflowsResponse,
  Node,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import { CustomJWTPayload } from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  createDatabase,
  createHandle,
  createWorkflow,
  deleteWorkflow,
  ExecutionStatus,
  getDeploymentByVersion,
  getExecution,
  getLatestDeployment,
  getWorkflow,
  getWorkflows,
  saveExecution,
  updateWorkflow,
  type WorkflowInsert,
} from "../db";
import { validateWorkflow } from "../utils/workflows";

// Extend the ApiContext with our custom variable
type ExtendedApiContext = ApiContext & {
  Variables: {
    jwtPayload?: CustomJWTPayload;
    organizationId?: string;
  };
};

const workflowRoutes = new Hono<ExtendedApiContext>();

/**
 * List all workflows for the current organization
 */
workflowRoutes.get("/", jwtMiddleware, async (c) => {
  const db = createDatabase(c.env.DB);

  const organizationId = c.get("organizationId")!;

  const allWorkflows = await getWorkflows(db, organizationId);

  // Convert DB workflow objects to WorkflowWithMetadata objects
  const workflows: WorkflowWithMetadata[] = allWorkflows.map((workflow) => {
    return {
      id: workflow.id,
      name: workflow.name,
      handle: workflow.handle,
      type: workflow.data.type,
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

    const newWorkflowData: WorkflowInsert = {
      id: workflowData.id,
      name: workflowData.name,
      handle: workflowData.handle,
      data: workflowData,
      organizationId: organizationId,
      createdAt: now,
      updatedAt: now,
    };

    const validationErrors = validateWorkflow(workflowData);
    if (validationErrors.length > 0) {
      return c.json({ errors: validationErrors }, 400);
    }

    const db = createDatabase(c.env.DB);
    const newWorkflow = await createWorkflow(db, newWorkflowData);

    const workflowDataFromDb = newWorkflow.data;

    const response: CreateWorkflowResponse = {
      id: newWorkflow.id,
      name: newWorkflow.name,
      handle: newWorkflow.handle,
      type: workflowDataFromDb.type,
      createdAt: newWorkflow.createdAt,
      updatedAt: newWorkflow.updatedAt,
      nodes: workflowDataFromDb.nodes,
      edges: workflowDataFromDb.edges,
    };

    return c.json(response, 201);
  }
);

/**
 * Get a specific workflow by ID
 */
workflowRoutes.get("/:id", jwtMiddleware, async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const organizationId = c.get("organizationId")!;
  const workflow = await getWorkflow(db, id, organizationId);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflowData = workflow.data;

  const response: GetWorkflowResponse = {
    id: workflow.id,
    name: workflow.name,
    handle: workflow.handle,
    type: workflowData.type,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
  };

  return c.json(response);
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
    const db = createDatabase(c.env.DB);

    const organizationId = c.get("organizationId")!;

    const existingWorkflow = await getWorkflow(db, id, organizationId);

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

    const workflowToValidate = {
      id: existingWorkflow.id,
      name: data.name ?? existingWorkflow.name,
      handle: existingWorkflow.handle,
      type: data.type || existingWorkflow.data?.type,
      nodes: sanitizedNodes,
      edges: Array.isArray(data.edges) ? data.edges : [],
    };
    const validationErrors = validateWorkflow(workflowToValidate);
    if (validationErrors.length > 0) {
      return c.json({ errors: validationErrors }, 400);
    }

    const updatedWorkflowData = {
      id: existingWorkflow.id,
      name: data.name ?? existingWorkflow.name,
      handle: existingWorkflow.handle,
      type: data.type || existingWorkflow.data?.type,
      nodes: sanitizedNodes,
      edges: Array.isArray(data.edges) ? data.edges : [],
    };

    const updatedWorkflow = await updateWorkflow(db, id, organizationId, {
      name: data.name,
      data: updatedWorkflowData,
      updatedAt: now,
    });

    const workflowDataFromDb = updatedWorkflow.data;

    const response: UpdateWorkflowResponse = {
      id: updatedWorkflow.id,
      name: updatedWorkflow.name,
      handle: updatedWorkflow.handle,
      type: workflowDataFromDb.type,
      createdAt: updatedWorkflow.createdAt,
      updatedAt: updatedWorkflow.updatedAt,
      nodes: workflowDataFromDb.nodes || [],
      edges: workflowDataFromDb.edges || [],
    };

    return c.json(response);
  }
);

/**
 * Delete a workflow by ID
 */
workflowRoutes.delete("/:id", jwtMiddleware, async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const organizationId = c.get("organizationId")!;

  const existingWorkflow = await getWorkflow(db, id, organizationId);

  if (!existingWorkflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const deletedWorkflow = await deleteWorkflow(db, id, organizationId);

  if (!deletedWorkflow) {
    return c.json({ error: "Failed to delete workflow" }, 500);
  }

  const response: DeleteWorkflowResponse = { id: deletedWorkflow.id };
  return c.json(response);
});

/**
 * Execute a workflow with the specified version
 * - version can be "dev" for development mode
 * - version can be "latest" for the latest deployment
 * - version can be a number for a specific deployment version
 */
workflowRoutes.post(
  "/:workflowIdOrHandle/execute/:version",
  apiKeyOrJwtMiddleware,
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const version = c.req.param("version");
    const db = createDatabase(c.env.DB);
    const monitorProgress =
      new URL(c.req.url).searchParams.get("monitorProgress") === "true";

    // Get organization ID from either JWT or API key auth
    let userId: string;
    const jwtPayload = c.get("jwtPayload") as CustomJWTPayload | undefined;

    if (jwtPayload) {
      // Authentication was via JWT
      // No need to re-check organization.id === organization.id, already done above.
      userId = jwtPayload.sub || "anonymous";
    } else {
      // Authentication was via API key
      // No need to re-check orgIdFromAuth === organization.id, already done above.
      userId = "api"; // Use a placeholder for API-triggered executions
    }

    // Get workflow data either from deployment or directly from workflow
    let workflowData;
    let workflow: any;
    let deploymentId: string | undefined;

    if (version === "dev") {
      // Get workflow data directly
      workflow = await getWorkflow(db, workflowIdOrHandle, organizationId);
      workflowData = workflow.data;
    } else {
      // Get deployment based on version
      let deployment;
      if (version === "latest") {
        deployment = await getLatestDeployment(
          db,
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
        deployment = await getDeploymentByVersion(
          db,
          workflowIdOrHandle,
          organizationId,
          version
        );
        if (!deployment) {
          return c.json({ error: "Deployment version not found" }, 404);
        }
      }

      deploymentId = deployment.id;
      workflowData = deployment.workflowData;
      workflow = {
        id: deployment.workflowId,
        name: workflowData.name,
      };
    }

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

    // Initialize formData variable
    let formData: Record<string, string | File> | undefined;

    // Get request body if it exists
    let body: any = undefined;
    const contentType = c.req.header("content-type");
    if (contentType?.includes("application/json")) {
      body = await c.req.json();
    } else if (
      contentType?.includes("multipart/form-data") ||
      contentType?.includes("application/x-www-form-urlencoded")
    ) {
      formData = Object.fromEntries(await c.req.formData());
      // Convert form data to body for consistency
      body = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => {
          // Try to parse numbers and booleans
          if (typeof value === 'string') {
            if (value.toLowerCase() === "true") return [key, true];
            if (value.toLowerCase() === "false") return [key, false];
            if (!isNaN(Number(value))) return [key, Number(value)];
          }
          return [key, value];
        })
      );
    }

    const baseExecutionParams = {
      userId,
      organizationId: organizationId,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        type: workflowData.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      },
      monitorProgress,
      deploymentId,
    };

    let finalExecutionParams: any;

    if (workflowData.type === "email_message") {
      const emailFrom = body?.from || "sender@example.com";
      const emailSubject = body?.subject || "Default Subject";
      const emailBody = body?.body || "Default email body.";
      const emailTo = `workflow+${organizationId}+${workflow.handle || workflow.id}@dafthunk.com`;

      const simulatedHeaders = {
        "from": emailFrom,
        "to": emailTo,
        "subject": emailSubject,
        "content-type": "text/plain; charset=us-ascii",
        "date": new Date().toUTCString(),
        "message-id": `<${uuid()}@dafthunk.com>`,
      };

      const simulatedRaw = `Received: from [127.0.0.1] (localhost [127.0.0.1])\n` +
                         `by dafthunk.com (Postfix) with ESMTP id FAKEIDFORTEST\n` +
                         `for <${emailTo}>; ${new Date().toUTCString()}\n` +
                         `From: ${emailFrom}\n` +
                         `To: ${emailTo}\n` +
                         `Subject: ${emailSubject}\n` +
                         `Date: ${new Date().toUTCString()}\n` +
                         `Message-ID: <${simulatedHeaders["message-id"]}>\n` +
                         `Content-Type: text/plain; charset=us-ascii\n` +
                         `Content-Transfer-Encoding: 7bit\n\n` +
                         `${emailBody}`;

      finalExecutionParams = {
        ...baseExecutionParams,
        emailMessage: {
          from: emailFrom,
          to: emailTo,
          headers: simulatedHeaders,
          raw: simulatedRaw,
        },
      };
    } else if (workflowData.type === "http_request") {
      finalExecutionParams = {
        ...baseExecutionParams,
        httpRequest: {
          url,
          method,
          headers,
          query,
          formData, // Will be undefined if not form-data content type
          body,     // Parsed JSON or converted form-data
        },
      };
    } else {
      // For other workflow types, include basic HTTP context without payload
      finalExecutionParams = {
        ...baseExecutionParams,
        httpRequest: {
          url,
          method,
          headers,
          query,
          // formData and body are intentionally omitted
        },
      };
    }

    const instance = await c.env.EXECUTE.create({
      params: finalExecutionParams,
    });
    const executionId = instance.id;

    // Build initial nodeExecutions
    const nodeExecutions = workflowData.nodes.map((node: Node) => ({
      nodeId: node.id,
      status: "executing" as const,
    }));

    // Save initial execution record
    const initialExecution = await saveExecution(db, {
      id: executionId,
      workflowId: workflow.id,
      deploymentId,
      userId,
      organizationId: organizationId,
      status: ExecutionStatus.EXECUTING,
      visibility: "private",
      nodeExecutions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response: ExecuteWorkflowResponse = {
      id: initialExecution.id,
      workflowId: initialExecution.workflowId,
      status: "submitted",
      nodeExecutions: initialExecution.nodeExecutions,
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
    const db = createDatabase(c.env.DB);

    // Get the execution to verify it exists and belongs to this organization
    const execution = await getExecution(db, executionId, organizationId);
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

    try {
      // Get the workflow instance and terminate it
      const instance = await c.env.EXECUTE.get(executionId);
      await instance.terminate();

      // Update the execution status in the database
      const now = new Date();
      const updatedExecution = await saveExecution(db, {
        id: executionId,
        workflowId: execution.workflowId,
        deploymentId: execution.deploymentId ?? undefined,
        userId: "cancelled", // Required by SaveExecutionRecord but not stored in DB
        organizationId: execution.organizationId,
        status: ExecutionStatus.CANCELLED,
        nodeExecutions: execution.data.nodeExecutions || [],
        error: execution.error ?? "Execution cancelled by user",
        visibility: execution.visibility,
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
      await saveExecution(db, {
        id: executionId,
        workflowId: execution.workflowId,
        deploymentId: execution.deploymentId ?? undefined,
        userId: "cancelled", // Required by SaveExecutionRecord but not stored in DB
        organizationId: execution.organizationId,
        status: ExecutionStatus.CANCELLED,
        nodeExecutions: execution.data.nodeExecutions || [],
        error: execution.error ?? "Execution cancelled by user",
        visibility: execution.visibility,
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
