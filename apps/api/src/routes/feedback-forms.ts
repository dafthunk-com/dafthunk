/**
 * Public Feedback Form Routes
 *
 * These routes are unauthenticated — the signed token IS the authorization.
 * They allow reviewers to view a workflow execution's outputs and submit
 * per-criterion feedback via a shareable URL produced by the
 * `create-feedback-form` node.
 */

import {
  isObjectReference,
  UNLISTED_LINK_TTL_SECONDS,
  verifyFormToken,
} from "@dafthunk/runtime";
import type { NodeExecution, ObjectReference, Workflow } from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import type { ApiContext } from "../context";
import { createDatabase } from "../db";
import { type FeedbackInsert, feedback, feedbackCriteria } from "../db/schema";
import { getAgentByName } from "../durable-objects/agent-utils";
import { CloudflareExecutionStore } from "../runtime/cloudflare-execution-store";
import {
  buildPresignedUrlConfig,
  CloudflareObjectStore,
} from "../runtime/cloudflare-object-store";

const feedbackFormRoutes = new Hono<ApiContext>();

interface VisibleOutput {
  name: string;
  description?: string;
  type: string;
  /**
   * Primitive / JSON value (absent for blob-like outputs — see `url`).
   */
  value?: unknown;
  /**
   * Presigned download URL for outputs that are ObjectReferences.
   */
  url?: string;
  mimeType?: string;
  filename?: string;
}

interface VisibleNode {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  outputs: VisibleOutput[];
}

/**
 * GET /feedback-forms/:signedToken
 *
 * Returns page config + the execution's visible outputs + evaluation
 * criteria for the workflow.
 */
feedbackFormRoutes.get("/:signedToken", async (c) => {
  const signedToken = c.req.param("signedToken");
  const payload = await verifyFormToken(signedToken, c.env.FORM_SIGNING_KEY);

  if (!payload || !payload.org) {
    return c.json({ error: "Invalid or expired feedback link" }, 400);
  }

  try {
    const agent = await getAgentByName(c.env.WORKFLOW_AGENT, payload.wid);
    const { submitted, config } = await agent.getFeedbackFormStatus(
      payload.tok
    );

    if (!config) {
      return c.json(
        {
          error: "Feedback page not yet available. Please try again shortly.",
        },
        404
      );
    }

    const parsed = JSON.parse(config) as {
      title: string;
      description?: string;
    };

    const executionStore = new CloudflareExecutionStore(c.env);
    const execution = await executionStore.getWithData(
      payload.eid,
      payload.org
    );

    const objectStore = new CloudflareObjectStore(
      c.env.RESSOURCES,
      buildPresignedUrlConfig(c.env)
    );

    const nodes = execution
      ? await buildVisibleNodes(
          execution.data.nodeExecutions,
          execution.data.workflowDefinition,
          objectStore
        )
      : [];

    const db = createDatabase(c.env.DB);
    const criterionRows = await db.query.feedbackCriteria.findMany({
      where: and(
        eq(feedbackCriteria.workflowId, payload.wid),
        eq(feedbackCriteria.organizationId, payload.org)
      ),
      orderBy: [feedbackCriteria.displayOrder],
    });

    const criteria = criterionRows.map((row) => ({
      id: row.id,
      question: row.question,
      description: row.description ?? undefined,
      displayOrder: row.displayOrder,
    }));

    return c.json({
      title: parsed.title,
      description: parsed.description,
      nodes,
      criteria,
      submitted,
    });
  } catch (error) {
    console.error("Error loading feedback form:", error);
    return c.json({ error: "Failed to load feedback form" }, 500);
  }
});

/**
 * POST /feedback-forms/:signedToken
 *
 * Submit anonymous feedback for the execution. Atomically marks the form
 * as submitted to prevent duplicates, then inserts one feedback row per
 * rated criterion.
 */
feedbackFormRoutes.post(
  "/:signedToken",
  zValidator(
    "json",
    z.object({
      responses: z
        .array(
          z.object({
            criterionId: z.string().min(1),
            sentiment: z.enum(["positive", "negative"]),
            comment: z.string().optional(),
          })
        )
        .min(1),
    })
  ),
  async (c) => {
    const signedToken = c.req.param("signedToken");
    const payload = await verifyFormToken(signedToken, c.env.FORM_SIGNING_KEY);

    if (!payload || !payload.org) {
      return c.json({ error: "Invalid or expired feedback link" }, 400);
    }

    const { responses } = c.req.valid("json");

    try {
      const agent = await getAgentByName(c.env.WORKFLOW_AGENT, payload.wid);
      const result = await agent.markFeedbackSubmitted(payload.tok);

      if (!result.success) {
        return c.json({ error: result.error }, 409);
      }

      const db = createDatabase(c.env.DB);
      const now = new Date();

      // Reject tampering: every referenced criterion must belong to the
      // workflow+org embedded in the signed token.
      const criterionIds = [...new Set(responses.map((r) => r.criterionId))];
      const validCriteria = await db.query.feedbackCriteria.findMany({
        where: and(
          eq(feedbackCriteria.workflowId, payload.wid),
          eq(feedbackCriteria.organizationId, payload.org),
          inArray(feedbackCriteria.id, criterionIds)
        ),
      });
      if (validCriteria.length !== criterionIds.length) {
        return c.json({ error: "Unknown criterion" }, 400);
      }

      const rows: FeedbackInsert[] = responses.map((r) => ({
        id: uuid(),
        executionId: payload.eid,
        criterionId: r.criterionId,
        workflowId: payload.wid,
        organizationId: payload.org!,
        userId: null,
        sentiment: r.sentiment,
        comment: r.comment || null,
        createdAt: now,
        updatedAt: now,
      }));

      if (rows.length > 0) {
        await db.insert(feedback).values(rows);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      return c.json({ error: "Failed to submit feedback" }, 500);
    }
  }
);

/**
 * For each completed node execution, map its non-hidden outputs to a
 * display-ready shape. Outputs that are ObjectReferences are converted to
 * presigned R2 URLs so the page can render them directly.
 *
 * Hidden outputs are skipped based on the node's output parameter metadata
 * captured in the execution's workflow definition.
 */
async function buildVisibleNodes(
  nodeExecutions: NodeExecution[],
  workflowDefinition: Workflow | undefined,
  objectStore: CloudflareObjectStore
): Promise<VisibleNode[]> {
  const nodesById = new Map(
    (workflowDefinition?.nodes ?? []).map((n) => [n.id, n])
  );

  const nodePromises = nodeExecutions.map(async (nodeExec) => {
    if (nodeExec.status !== "completed" || !nodeExec.outputs) return null;

    const defNode = nodesById.get(nodeExec.nodeId);
    if (defNode?.type === "create-feedback-form") return null;

    const outputDefs = new Map(
      (defNode?.outputs ?? []).map((o) => [o.name, o])
    );

    const outputPromises = Object.entries(nodeExec.outputs)
      .filter(([name]) => {
        const def = outputDefs.get(name);
        if (def?.hidden) return false;
        return name !== "schema" && name !== "feedbackFormConfig";
      })
      .map(async ([name, value]): Promise<VisibleOutput> => {
        const def = outputDefs.get(name);

        if (isObjectReference(value)) {
          const ref = value as ObjectReference;
          const url = await objectStore
            .getPresignedUrl(ref, UNLISTED_LINK_TTL_SECONDS)
            .catch((error) => {
              console.error(
                `Failed to presign object ${ref.id} for feedback page:`,
                error
              );
              return undefined;
            });
          return {
            name,
            description: def?.description,
            type: mimeTypeToKind(ref.mimeType),
            url,
            mimeType: ref.mimeType,
            filename: ref.filename,
          };
        }

        return {
          name,
          description: def?.description,
          type: def?.type ?? typeofValue(value),
          value,
        };
      });

    const outputs = await Promise.all(outputPromises);
    if (outputs.length === 0) return null;

    return {
      nodeId: nodeExec.nodeId,
      nodeName: defNode?.name ?? nodeExec.nodeId,
      nodeType: defNode?.type ?? "",
      outputs,
    } satisfies VisibleNode;
  });

  const resolved = await Promise.all(nodePromises);
  return resolved.filter((n): n is VisibleNode => n !== null);
}

function mimeTypeToKind(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "blob";
}

function typeofValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  return "json";
}

export default feedbackFormRoutes;
