/**
 * Public Form Trigger Routes
 *
 * Renders a workflow's entry form (from the form-trigger node's schema) and
 * accepts submissions that START the workflow. Unauthenticated — the workflow
 * id in the URL is the handle, and the workflow only responds when it is
 * enabled and has a form-trigger node. `form_request` runs synchronously
 * (worker runtime); `form_webhook` runs asynchronously (durable runtime).
 */

import { validateRecord } from "@dafthunk/runtime/utils/schema-validation";
import type { Field, NodeExecution, Schema, Workflow } from "@dafthunk/types";
import { type Context, Hono } from "hono";

import type { ApiContext } from "../context";
import {
  createDatabase,
  getOrganizationBillingInfo,
  getSchema,
  getWorkflowByIdUnscoped,
  resolveOrganizationBillingOptions,
} from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { CloudflareObjectStore } from "../runtime/cloudflare-object-store";
import { WorkflowExecutor } from "../services/workflow-executor";
import { WorkflowStore } from "../stores/workflow-store";
import { isCreditExhausted } from "../utils/credits";
import {
  type FormTriggerInfo,
  findFormResponse,
  findFormTrigger,
} from "./form-trigger-utils";
import { buildMultipartRecord } from "./form-upload";

const formTriggerRoutes = new Hono<ApiContext>();

interface ResolvedForm {
  organizationId: string;
  workflow: NonNullable<Awaited<ReturnType<typeof getWorkflowByIdUnscoped>>>;
  workflowData: Workflow;
  trigger: FormTriggerInfo;
  schema: Schema;
}

/**
 * Resolves a schema reference (a stored schema id or an inline Schema object)
 * to a full Schema. Shared by the form trigger and the form-response node.
 */
async function resolveSchemaRef(
  db: ReturnType<typeof createDatabase>,
  schemaRef: string | Record<string, unknown>,
  organizationId: string
): Promise<Schema | null> {
  if (typeof schemaRef === "string") {
    const row = await getSchema(db, schemaRef, organizationId);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      fields: JSON.parse(row.fields) as Field[],
    };
  }
  if ("fields" in schemaRef) {
    return schemaRef as unknown as Schema;
  }
  return null;
}

/**
 * Resolves the workflow, its live graph, the form-trigger config, and the
 * schema. Returns a string error key for the caller to map to a status.
 */
async function resolveForm(
  c: Context<ApiContext>,
  workflowId: string
): Promise<ResolvedForm | "not_found"> {
  const db = createDatabase(c.env.DB);
  const workflow = await getWorkflowByIdUnscoped(db, workflowId);
  if (!workflow || !workflow.enabled) return "not_found";

  const organizationId = workflow.organizationId;
  const store = new WorkflowStore(c.env);
  const data = await store.getWithData(workflowId, organizationId);
  if (!data?.data) return "not_found";

  const trigger = findFormTrigger(data.data.nodes);
  if (!trigger) return "not_found";

  const schema = await resolveSchemaRef(db, trigger.schemaRef, organizationId);
  if (!schema) return "not_found";

  return { organizationId, workflow, workflowData: data.data, trigger, schema };
}

interface FormResponsePayload {
  fields: Field[];
  record: Record<string, unknown>;
}

/**
 * Reads the `form-response` node's composed record from a finished execution,
 * paired with its schema fields so the public page can render the result.
 * Returns null when the workflow has no response node or it produced nothing.
 */
async function buildFormResponse(
  db: ReturnType<typeof createDatabase>,
  workflowData: Workflow,
  organizationId: string,
  nodeExecutions: NodeExecution[]
): Promise<FormResponsePayload | null> {
  const responseNode = findFormResponse(workflowData.nodes);
  if (!responseNode) return null;

  const schema = await resolveSchemaRef(
    db,
    responseNode.schemaRef,
    organizationId
  );
  if (!schema) return null;

  const record = nodeExecutions.find((ne) => ne.nodeId === responseNode.nodeId)
    ?.outputs?.record;
  if (!record || typeof record !== "object") return null;

  return { fields: schema.fields, record: record as Record<string, unknown> };
}

/**
 * GET /form-triggers/:workflowId
 *
 * Returns the form config so the public page can render it.
 */
formTriggerRoutes.get("/:workflowId", async (c) => {
  const resolved = await resolveForm(c, c.req.param("workflowId"));
  if (resolved === "not_found") {
    return c.json({ error: "Form not found" }, 404);
  }

  const { trigger, schema } = resolved;
  return c.json({
    title: trigger.title || schema.name,
    description: trigger.description,
    fields: schema.fields,
    mode: trigger.mode,
  });
});

/**
 * POST /form-triggers/:workflowId
 *
 * Validates the submission and starts the workflow. Sync vs async is forced by
 * the trigger mode, not by the workflow's stored runtime.
 */
formTriggerRoutes.post(
  "/:workflowId",
  (c, next) => createRateLimitMiddleware(c.env.RATE_LIMIT_EXECUTE)(c, next),
  async (c) => {
    const resolved = await resolveForm(c, c.req.param("workflowId"));
    if (resolved === "not_found") {
      return c.json({ error: "Form not found" }, 404);
    }

    const { organizationId, workflow, workflowData, trigger, schema } =
      resolved;
    const db = createDatabase(c.env.DB);

    const billingInfo = await getOrganizationBillingInfo(db, organizationId);
    if (!billingInfo) {
      return c.json({ error: "Organization not found" }, 404);
    }
    if (isCreditExhausted(billingInfo, c.env.CLOUDFLARE_ENV)) {
      return c.json({ error: "Insufficient compute credits" }, 402 as const);
    }

    // Build the record from the submission (multipart uploads files to R2).
    let record: Record<string, unknown>;
    try {
      const contentType = c.req.header("content-type") ?? "";
      if (contentType.includes("multipart/form-data")) {
        const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
        const form = await c.req.formData();
        record = await buildMultipartRecord(
          form,
          schema.fields,
          organizationId,
          objectStore
        );
      } else {
        record = await c.req.json<Record<string, unknown>>();
      }
    } catch (error) {
      return c.json(
        {
          error: error instanceof Error ? error.message : "Invalid submission",
        },
        400
      );
    }

    const validated = validateRecord(record, schema);
    if (validated.errors.length > 0) {
      return c.json({ error: validated.errors.join("; ") }, 400);
    }

    // request → synchronous (worker); webhook → asynchronous (durable).
    const runtime = trigger.mode === "request" ? "worker" : "workflow";

    const { execution } = await WorkflowExecutor.execute({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        trigger: workflowData.trigger,
        runtime,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      },
      userId: "form",
      organizationId,
      ...resolveOrganizationBillingOptions(billingInfo, c.env.CLOUDFLARE_ENV),
      parameters: { formRecord: validated.record },
      env: c.env,
    });

    // Webhook: fire-and-forget confirmation.
    if (trigger.mode === "webhook") {
      return c.json({ success: true }, 201);
    }

    // Request: report the outcome and, when the workflow defines a
    // form-response node, the record it produced so the page can render it.
    const response = await buildFormResponse(
      db,
      workflowData,
      organizationId,
      execution.nodeExecutions
    );
    return c.json(
      {
        success: execution.status === "completed",
        status: execution.status,
        ...(response ? { response } : {}),
      },
      201
    );
  }
);

export default formTriggerRoutes;
