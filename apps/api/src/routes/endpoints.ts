import type {
  CreateEndpointRequest,
  CreateEndpointResponse,
  DeleteEndpointResponse,
  ExecuteWorkflowResponse,
  GetEndpointResponse,
  ListEndpointsResponse,
  UpdateEndpointRequest,
  UpdateEndpointResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  createDatabase,
  createEndpoint,
  createHandle,
  deleteEndpoint,
  getEndpoint,
  getEndpoints,
  getEndpointTriggersByEndpoint,
  getOrganizationBillingInfo,
  updateEndpoint,
} from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { WorkflowExecutor } from "../services/workflow-executor";
import { WorkflowStore } from "../stores/workflow-store";
import { getAuthContext } from "../utils/auth-context";
import {
  isExecutionPreparationError,
  prepareWorkflowExecution,
} from "../utils/execution-preparation";

type ExtendedApiContext = ApiContext & {
  Variables: {
    organizationId?: string;
  };
};

const endpointRoutes = new Hono<ExtendedApiContext>();

endpointRoutes.use("*", jwtMiddleware);

/**
 * List all endpoints for the current organization
 */
endpointRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allEndpoints = await getEndpoints(db, organizationId);

  const response: ListEndpointsResponse = {
    endpoints: allEndpoints,
  };
  return c.json(response);
});

/**
 * Create a new endpoint for the current organization
 */
endpointRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Endpoint name is required"),
      mode: z.enum(["webhook", "request"]),
    }) as z.ZodType<CreateEndpointRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const now = new Date();
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    const endpointId = uuid();
    const endpointName = data.name || "Untitled Endpoint";
    const endpointHandle = createHandle(endpointName);

    const newEndpoint = await createEndpoint(db, {
      id: endpointId,
      name: endpointName,
      handle: endpointHandle,
      mode: data.mode,
      organizationId: organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateEndpointResponse = {
      id: newEndpoint.id,
      name: newEndpoint.name,
      handle: newEndpoint.handle,
      mode: newEndpoint.mode,
      createdAt: newEndpoint.createdAt,
      updatedAt: newEndpoint.updatedAt,
    };

    return c.json(response, 201);
  }
);

/**
 * Get a specific endpoint by ID
 */
endpointRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const endpoint = await getEndpoint(db, id, organizationId);
  if (!endpoint) {
    return c.json({ error: "Endpoint not found" }, 404);
  }

  const response: GetEndpointResponse = {
    id: endpoint.id,
    name: endpoint.name,
    handle: endpoint.handle,
    mode: endpoint.mode,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt,
  };

  return c.json(response);
});

/**
 * Update an endpoint by ID
 */
endpointRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Endpoint name is required"),
      mode: z.enum(["webhook", "request"]),
    }) as z.ZodType<UpdateEndpointRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingEndpoint = await getEndpoint(db, id, organizationId);
    if (!existingEndpoint) {
      return c.json({ error: "Endpoint not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();

    const updatedEndpoint = await updateEndpoint(db, id, organizationId, {
      name: data.name,
      mode: data.mode,
      updatedAt: now,
    });

    const response: UpdateEndpointResponse = {
      id: updatedEndpoint.id,
      name: updatedEndpoint.name,
      handle: updatedEndpoint.handle,
      mode: updatedEndpoint.mode,
      createdAt: updatedEndpoint.createdAt,
      updatedAt: updatedEndpoint.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Delete an endpoint by ID
 */
endpointRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingEndpoint = await getEndpoint(db, id, organizationId);
  if (!existingEndpoint) {
    return c.json({ error: "Endpoint not found" }, 404);
  }

  const deletedEndpoint = await deleteEndpoint(db, id, organizationId);
  if (!deletedEndpoint) {
    return c.json({ error: "Failed to delete endpoint" }, 500);
  }

  const response: DeleteEndpointResponse = { id: deletedEndpoint.id };
  return c.json(response);
});

/**
 * Execute workflows triggered by an endpoint
 * Executes enabled workflows triggered by an endpoint
 */
endpointRoutes.on(
  ["GET", "POST"],
  "/:id/execute",
  apiKeyOrJwtMiddleware,
  (c, next) => createRateLimitMiddleware(c.env.RATE_LIMIT_EXECUTE)(c, next),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const { organizationId, userId, userPlan } = getAuthContext(c);

    // Verify endpoint exists and belongs to organization
    const endpoint = await getEndpoint(db, id, organizationId);
    if (!endpoint) {
      return c.json({ error: "Endpoint not found" }, 404);
    }

    // Find active workflow triggers for this endpoint
    const triggers = await getEndpointTriggersByEndpoint(
      db,
      endpoint.id,
      organizationId
    );

    if (triggers.length === 0) {
      return c.json(
        { error: "No active workflows linked to this endpoint" },
        404
      );
    }

    // Get organization billing info
    const billingInfo = await getOrganizationBillingInfo(db, organizationId);
    if (!billingInfo) {
      return c.json({ error: "Organization not found" }, 404);
    }
    const { computeCredits, subscriptionStatus, overageLimit } = billingInfo;

    const workflowStore = new WorkflowStore(c.env);
    const executions: ExecuteWorkflowResponse[] = [];

    for (const { workflow } of triggers) {
      // Require workflow to be enabled
      if (!workflow.enabled) {
        continue;
      }

      // Load workflow data from working version
      let workflowData;
      try {
        const workflowWithData = await workflowStore.getWithData(
          workflow.id,
          organizationId
        );
        if (!workflowWithData?.data) continue;
        workflowData = workflowWithData.data;
      } catch {
        continue;
      }

      // Prepare workflow for execution
      const preparationResult = await prepareWorkflowExecution(c, workflowData);
      if (isExecutionPreparationError(preparationResult)) {
        continue;
      }

      const { parameters } = preparationResult;

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

      executions.push({
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        nodeExecutions: execution.nodeExecutions,
      });
    }

    if (executions.length === 0) {
      return c.json({ error: "No enabled workflows found" }, 404);
    }

    // Return single execution directly, or array for multiple
    if (executions.length === 1) {
      return c.json(executions[0], 201);
    }

    return c.json({ executions }, 201);
  }
);

export default endpointRoutes;
