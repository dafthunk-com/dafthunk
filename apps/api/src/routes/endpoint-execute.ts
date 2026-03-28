import type { ExecuteWorkflowResponse } from "@dafthunk/types";
import { Hono } from "hono";

import type { ApiContext } from "../context";
import {
  createDatabase,
  getEndpointById,
  getEndpointTriggersByEndpoint,
  getOrganizationBillingInfo,
  resolveOrganizationPlan,
  verifyApiKey,
} from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { WorkflowExecutor } from "../services/workflow-executor";
import { WorkflowStore } from "../stores/workflow-store";
import {
  isExecutionPreparationError,
  prepareWorkflowExecution,
} from "../utils/execution-preparation";

const endpointExecuteRoutes = new Hono<ApiContext>();

/**
 * Execute workflows triggered by an endpoint.
 * Authentication via API key validated against the endpoint's organization.
 * No organization ID required in the URL — derived from the endpoint record.
 */
endpointExecuteRoutes.on(
  ["GET", "POST"],
  "/:id/execute",
  (c, next) => createRateLimitMiddleware(c.env.RATE_LIMIT_EXECUTE)(c, next),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);

    // Look up endpoint by ID (globally unique)
    const endpoint = await getEndpointById(db, id);
    if (!endpoint) {
      return c.json({ error: "Endpoint not found" }, 404);
    }

    const organizationId = endpoint.organizationId;

    // Authenticate via API key against the endpoint's organization
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "API key is required" }, 401);
    }

    const apiKey = authHeader.substring(7);
    const validatedOrgId = await verifyApiKey(db, apiKey, organizationId);
    if (!validatedOrgId) {
      return c.json({ error: "Invalid API key" }, 401);
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
      if (!workflow.enabled) {
        continue;
      }

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

      const preparationResult = await prepareWorkflowExecution(c, workflowData);
      if (isExecutionPreparationError(preparationResult)) {
        continue;
      }

      const { parameters } = preparationResult;

      const { execution } = await WorkflowExecutor.execute({
        workflow: {
          id: workflow.id,
          name: workflow.name,
          trigger: workflowData.trigger,
          runtime: workflowData.runtime,
          nodes: workflowData.nodes,
          edges: workflowData.edges,
        },
        userId: "api_key",
        organizationId,
        computeCredits,
        subscriptionStatus: subscriptionStatus ?? undefined,
        overageLimit: overageLimit ?? null,
        parameters,
        userPlan: resolveOrganizationPlan(billingInfo, c.env.CLOUDFLARE_ENV),
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

    if (executions.length === 1) {
      return c.json(executions[0], 201);
    }

    return c.json({ executions }, 201);
  }
);

export default endpointExecuteRoutes;
