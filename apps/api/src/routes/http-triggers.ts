/**
 * Public HTTP Trigger Routes
 *
 * Executes a workflow directly from its id: `/http/:workflowId`. The workflow id
 * in the URL is the handle (mirroring the form-trigger routes), so there is no
 * separate endpoint resource. Authenticated with an API key validated against
 * the workflow's organization. `http_request` runs synchronously (worker
 * runtime); `http_webhook` runs asynchronously (durable runtime).
 */

import type { ExecuteWorkflowResponse, Node } from "@dafthunk/types";
import { Hono } from "hono";

import type { ApiContext } from "../context";
import {
  createDatabase,
  getOrganizationBillingInfo,
  getWorkflowByIdUnscoped,
  resolveOrganizationBillingOptions,
  verifyApiKey,
} from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { WorkflowExecutor } from "../services/workflow-executor";
import { WorkflowStore } from "../stores/workflow-store";
import { isCreditExhausted } from "../utils/credits";
import {
  isExecutionPreparationError,
  prepareWorkflowExecution,
} from "../utils/execution-preparation";

const httpTriggerRoutes = new Hono<ApiContext>();

/**
 * The HTTP trigger node types and the runtime each one forces.
 * `http-request` → synchronous (worker); `http-webhook` → asynchronous (durable).
 */
const HTTP_TRIGGER_RUNTIME: Record<string, "worker" | "workflow"> = {
  "http-request": "worker",
  "http-webhook": "workflow",
};

export function findHttpTrigger(nodes: Node[]): "worker" | "workflow" | null {
  const node = nodes.find((n) => HTTP_TRIGGER_RUNTIME[n.type] !== undefined);
  return node ? HTTP_TRIGGER_RUNTIME[node.type] : null;
}

/**
 * GET|POST /http/:workflowId
 *
 * Runs the workflow with the incoming HTTP request as input. Sync vs async is
 * forced by the trigger node type, not the workflow's stored runtime.
 */
httpTriggerRoutes.on(
  ["GET", "POST"],
  "/:workflowId",
  (c, next) => createRateLimitMiddleware(c.env.RATE_LIMIT_EXECUTE)(c, next),
  async (c) => {
    const workflowId = c.req.param("workflowId");
    const db = createDatabase(c.env.DB);

    const workflow = await getWorkflowByIdUnscoped(db, workflowId);
    if (!workflow || !workflow.enabled) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const organizationId = workflow.organizationId;

    // Authenticate via API key against the workflow's organization.
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "API key is required" }, 401);
    }
    const apiKey = authHeader.substring(7);
    const validatedOrgId = await verifyApiKey(db, apiKey, organizationId);
    if (!validatedOrgId) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    const store = new WorkflowStore(c.env);
    const workflowWithData = await store.getWithData(
      workflowId,
      organizationId
    );
    if (!workflowWithData?.data) {
      return c.json({ error: "Workflow not found" }, 404);
    }
    const workflowData = workflowWithData.data;

    const runtime = findHttpTrigger(workflowData.nodes);
    if (!runtime) {
      return c.json({ error: "Workflow has no HTTP trigger" }, 404);
    }

    const billingInfo = await getOrganizationBillingInfo(db, organizationId);
    if (!billingInfo) {
      return c.json({ error: "Organization not found" }, 404);
    }
    if (isCreditExhausted(billingInfo, c.env.CLOUDFLARE_ENV)) {
      return c.json({ error: "Insufficient compute credits" }, 402 as const);
    }

    const preparationResult = await prepareWorkflowExecution(c, workflowData);
    if (isExecutionPreparationError(preparationResult)) {
      return c.json(
        { error: preparationResult.error },
        preparationResult.status as 400
      );
    }

    const { execution } = await WorkflowExecutor.execute({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        trigger: workflowData.trigger,
        runtime,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      },
      userId: "api_key",
      organizationId,
      ...resolveOrganizationBillingOptions(billingInfo, c.env.CLOUDFLARE_ENV),
      parameters: preparationResult.parameters,
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

export default httpTriggerRoutes;
