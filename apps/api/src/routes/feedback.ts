import type {
  BatchCreateFeedbackRequest,
  BatchCreateFeedbackResponse,
  CreateExecutionFeedbackResponse,
  CreateFeedbackCriterionRequest,
  ExecutionFeedback,
  FeedbackCriterion,
  ListExecutionFeedbackResponse,
  ListFeedbackCriteriaResponse,
  UpdateFeedbackCriterionRequest,
  UpsertFeedbackRequest,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { createDatabase } from "../db";
import {
  type FeedbackCriteriaInsert,
  type FeedbackInsert,
  feedback,
  feedbackCriteria,
  workflows,
} from "../db/schema";
import { CloudflareExecutionStore } from "../runtime/cloudflare-execution-store";

const feedbackRoutes = new Hono<ApiContext>();

feedbackRoutes.use("*", jwtMiddleware);

// ─────────────────────────────────────────────
// Criteria CRUD
// ─────────────────────────────────────────────

/**
 * Create a feedback criterion for a workflow (workflow-level, deployment_id = NULL)
 */
feedbackRoutes.post(
  "/criteria",
  zValidator(
    "json",
    z.object({
      workflowId: z.string().min(1),
      question: z.string().min(1),
      description: z.string().optional(),
      displayOrder: z.number().int().min(0).optional(),
    }) as z.ZodType<CreateFeedbackCriterionRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const body = c.req.valid("json");
    const db = createDatabase(c.env.DB);

    // Verify the workflow belongs to the caller's organization
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, body.workflowId),
        eq(workflows.organizationId, organizationId)
      ),
    });
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const id = uuid();
    const now = new Date();

    const data: FeedbackCriteriaInsert = {
      id,
      workflowId: body.workflowId,
      deploymentId: null,
      organizationId,
      question: body.question,
      description: body.description || null,
      displayOrder: body.displayOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(feedbackCriteria).values(data);

    const criterion: FeedbackCriterion = {
      id,
      workflowId: body.workflowId,
      question: body.question,
      description: body.description,
      displayOrder: body.displayOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    return c.json(criterion, 201);
  }
);

/**
 * List all criteria for the organization (workflow-level only, deployment_id IS NULL)
 */
feedbackRoutes.get("/criteria", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);

  const rows = await db.query.feedbackCriteria.findMany({
    where: and(
      eq(feedbackCriteria.organizationId, organizationId),
      isNull(feedbackCriteria.deploymentId)
    ),
    orderBy: [feedbackCriteria.displayOrder],
  });

  const response: ListFeedbackCriteriaResponse = {
    criteria: rows.map(toCriterion),
  };

  return c.json(response);
});

/**
 * List editable criteria for a workflow (deployment_id IS NULL)
 */
feedbackRoutes.get("/criteria/workflow/:workflowId", async (c) => {
  const organizationId = c.get("organizationId")!;
  const workflowId = c.req.param("workflowId");
  const db = createDatabase(c.env.DB);

  const rows = await db.query.feedbackCriteria.findMany({
    where: and(
      eq(feedbackCriteria.workflowId, workflowId),
      eq(feedbackCriteria.organizationId, organizationId),
      isNull(feedbackCriteria.deploymentId)
    ),
    orderBy: [feedbackCriteria.displayOrder],
  });

  const response: ListFeedbackCriteriaResponse = {
    criteria: rows.map(toCriterion),
  };

  return c.json(response);
});

/**
 * List frozen criteria for a deployment
 */
feedbackRoutes.get("/criteria/deployment/:deploymentId", async (c) => {
  const organizationId = c.get("organizationId")!;
  const deploymentId = c.req.param("deploymentId");
  const db = createDatabase(c.env.DB);

  const rows = await db.query.feedbackCriteria.findMany({
    where: and(
      eq(feedbackCriteria.deploymentId, deploymentId),
      eq(feedbackCriteria.organizationId, organizationId)
    ),
    orderBy: [feedbackCriteria.displayOrder],
  });

  const response: ListFeedbackCriteriaResponse = {
    criteria: rows.map(toCriterion),
  };

  return c.json(response);
});

/**
 * Update a workflow-level criterion (only if deployment_id IS NULL)
 */
feedbackRoutes.patch(
  "/criteria/:id",
  zValidator(
    "json",
    z.object({
      question: z.string().min(1).optional(),
      description: z.string().optional(),
      displayOrder: z.number().int().min(0).optional(),
    }) as z.ZodType<UpdateFeedbackCriterionRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const db = createDatabase(c.env.DB);

    const existing = await db.query.feedbackCriteria.findFirst({
      where: and(
        eq(feedbackCriteria.id, id),
        eq(feedbackCriteria.organizationId, organizationId),
        isNull(feedbackCriteria.deploymentId)
      ),
    });

    if (!existing) {
      return c.json({ error: "Criterion not found" }, 404);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.question !== undefined) updates.question = body.question;
    if (body.description !== undefined)
      updates.description = body.description || null;
    if (body.displayOrder !== undefined)
      updates.displayOrder = body.displayOrder;

    await db
      .update(feedbackCriteria)
      .set(updates)
      .where(eq(feedbackCriteria.id, id));

    const updated = await db.query.feedbackCriteria.findFirst({
      where: eq(feedbackCriteria.id, id),
    });

    return c.json(toCriterion(updated!));
  }
);

/**
 * Delete a workflow-level criterion
 */
feedbackRoutes.delete("/criteria/:id", async (c) => {
  const organizationId = c.get("organizationId")!;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const existing = await db.query.feedbackCriteria.findFirst({
    where: and(
      eq(feedbackCriteria.id, id),
      eq(feedbackCriteria.organizationId, organizationId),
      isNull(feedbackCriteria.deploymentId)
    ),
  });

  if (!existing) {
    return c.json({ error: "Criterion not found" }, 404);
  }

  await db.delete(feedbackCriteria).where(eq(feedbackCriteria.id, id));

  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// Feedback CRUD
// ─────────────────────────────────────────────

/**
 * Upsert feedback for a single criterion (auto-save)
 */
feedbackRoutes.put(
  "/",
  zValidator(
    "json",
    z.object({
      executionId: z.string().min(1),
      criterionId: z.string().min(1),
      sentiment: z.enum(["positive", "negative"]),
      comment: z.string().optional(),
    }) as z.ZodType<UpsertFeedbackRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const jwtPayload = c.get("jwtPayload")!;
    const userId = jwtPayload.sub;
    const body = c.req.valid("json");

    const db = createDatabase(c.env.DB);
    const executionStore = new CloudflareExecutionStore(c.env);

    // Verify execution exists
    const execution = await executionStore.get(
      body.executionId,
      organizationId
    );
    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    // Verify criterion exists
    const criterion = await db.query.feedbackCriteria.findFirst({
      where: and(
        eq(feedbackCriteria.id, body.criterionId),
        eq(feedbackCriteria.organizationId, organizationId)
      ),
    });
    if (!criterion) {
      return c.json({ error: "Criterion not found" }, 400);
    }

    const now = new Date();
    const feedbackId = uuid();

    const data: FeedbackInsert = {
      id: feedbackId,
      executionId: body.executionId,
      criterionId: body.criterionId,
      workflowId: execution.workflowId || null,
      deploymentId: execution.deploymentId || null,
      organizationId,
      userId,
      sentiment: body.sentiment,
      comment: body.comment || null,
      createdAt: now,
      updatedAt: now,
    };

    await db
      .insert(feedback)
      .values(data)
      .onConflictDoUpdate({
        target: [feedback.executionId, feedback.criterionId],
        set: {
          sentiment: body.sentiment,
          comment: body.comment || null,
          updatedAt: now,
        },
      });

    // Fetch the actual row (may be the existing one with its original id)
    const row = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.executionId, body.executionId),
        eq(feedback.criterionId, body.criterionId)
      ),
    });

    const response: ExecutionFeedback = {
      id: row!.id,
      executionId: body.executionId,
      criterionId: body.criterionId,
      criterionQuestion: criterion.question,
      workflowId: execution.workflowId || undefined,
      deploymentId: execution.deploymentId || undefined,
      sentiment: body.sentiment,
      comment: body.comment,
      createdAt: row!.createdAt,
      updatedAt: row!.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Batch create feedback for an execution (all criteria at once)
 */
feedbackRoutes.post(
  "/batch",
  zValidator(
    "json",
    z.object({
      executionId: z.string().min(1),
      responses: z.array(
        z.object({
          criterionId: z.string().min(1),
          sentiment: z.enum(["positive", "negative"]),
          comment: z.string().optional(),
        })
      ),
    }) as z.ZodType<BatchCreateFeedbackRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const jwtPayload = c.get("jwtPayload")!;
    const userId = jwtPayload.sub;
    const { executionId, responses } = c.req.valid("json");

    const db = createDatabase(c.env.DB);
    const executionStore = new CloudflareExecutionStore(c.env);

    // Verify execution exists
    const execution = await executionStore.get(executionId, organizationId);
    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    const now = new Date();
    const results: CreateExecutionFeedbackResponse[] = [];

    for (const resp of responses) {
      // Verify criterion exists and belongs to the deployment
      const criterion = await db.query.feedbackCriteria.findFirst({
        where: and(
          eq(feedbackCriteria.id, resp.criterionId),
          eq(feedbackCriteria.organizationId, organizationId)
        ),
      });

      if (!criterion) {
        return c.json(
          { error: `Criterion ${resp.criterionId} not found` },
          400
        );
      }

      const feedbackId = uuid();

      const data: FeedbackInsert = {
        id: feedbackId,
        executionId,
        criterionId: resp.criterionId,
        workflowId: execution.workflowId || null,
        deploymentId: execution.deploymentId || null,
        organizationId,
        userId,
        sentiment: resp.sentiment,
        comment: resp.comment || null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(feedback).values(data);

      results.push({
        id: feedbackId,
        executionId,
        criterionId: resp.criterionId,
        workflowId: execution.workflowId || undefined,
        deploymentId: execution.deploymentId || undefined,
        sentiment: resp.sentiment,
        comment: resp.comment,
        createdAt: now,
      });
    }

    const response: BatchCreateFeedbackResponse = { feedback: results };
    return c.json(response, 201);
  }
);

/**
 * Get feedback for a specific execution (returns array of per-criterion feedback)
 */
feedbackRoutes.get("/execution/:executionId", async (c) => {
  const organizationId = c.get("organizationId")!;
  const executionId = c.req.param("executionId");
  const db = createDatabase(c.env.DB);

  const rows = await db.query.feedback.findMany({
    where: and(
      eq(feedback.executionId, executionId),
      eq(feedback.organizationId, organizationId)
    ),
    orderBy: [feedback.createdAt],
    with: {
      workflow: { columns: { name: true } },
      deployment: { columns: { version: true } },
      criterion: { columns: { question: true } },
    },
  });

  const response: ListExecutionFeedbackResponse = {
    feedback: rows.map(feedbackRowToResponse),
  };

  return c.json(response);
});

/**
 * List feedback for a deployment
 */
feedbackRoutes.get("/deployment/:deploymentId", async (c) => {
  const organizationId = c.get("organizationId")!;
  const deploymentId = c.req.param("deploymentId");
  const db = createDatabase(c.env.DB);

  const rows = await db.query.feedback.findMany({
    where: and(
      eq(feedback.deploymentId, deploymentId),
      eq(feedback.organizationId, organizationId)
    ),
    orderBy: [desc(feedback.createdAt)],
    with: {
      workflow: { columns: { name: true } },
      deployment: { columns: { version: true } },
      criterion: { columns: { question: true } },
    },
  });

  const response: ListExecutionFeedbackResponse = {
    feedback: rows.map(feedbackRowToResponse),
  };

  return c.json(response);
});

/**
 * List feedback for the organization with optional filters and pagination
 */
feedbackRoutes.get("/", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);

  const {
    workflowId,
    deploymentId,
    criterionId,
    sentiment,
    startDate,
    endDate,
    limit,
    offset,
  } = c.req.query();

  const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

  const conditions = [eq(feedback.organizationId, organizationId)];
  if (workflowId) conditions.push(eq(feedback.workflowId, workflowId));
  if (deploymentId) conditions.push(eq(feedback.deploymentId, deploymentId));
  if (criterionId) conditions.push(eq(feedback.criterionId, criterionId));
  if (sentiment === "positive" || sentiment === "negative") {
    conditions.push(eq(feedback.sentiment, sentiment));
  }
  if (startDate) conditions.push(gte(feedback.createdAt, new Date(startDate)));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(feedback.createdAt, end));
  }

  const rows = await db.query.feedback.findMany({
    where: and(...conditions),
    orderBy: [desc(feedback.createdAt)],
    limit: parsedLimit,
    offset: parsedOffset,
    with: {
      workflow: { columns: { name: true } },
      deployment: { columns: { version: true } },
      criterion: { columns: { question: true } },
    },
  });

  const response: ListExecutionFeedbackResponse = {
    feedback: rows.map(feedbackRowToResponse),
  };

  return c.json(response);
});

/**
 * Delete a single feedback entry
 */
feedbackRoutes.delete("/:id", async (c) => {
  const organizationId = c.get("organizationId")!;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const existing = await db.query.feedback.findFirst({
    where: and(
      eq(feedback.id, id),
      eq(feedback.organizationId, organizationId)
    ),
  });

  if (!existing) {
    return c.json({ error: "Feedback not found" }, 404);
  }

  await db.delete(feedback).where(eq(feedback.id, id));
  return c.json({ success: true });
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toCriterion(row: {
  id: string;
  workflowId: string;
  deploymentId: string | null;
  question: string;
  description: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): FeedbackCriterion {
  return {
    id: row.id,
    workflowId: row.workflowId,
    deploymentId: row.deploymentId ?? undefined,
    question: row.question,
    description: row.description ?? undefined,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function feedbackRowToResponse(f: any): ExecutionFeedback {
  const workflow = Array.isArray(f.workflow) ? f.workflow[0] : f.workflow;
  const deployment = Array.isArray(f.deployment)
    ? f.deployment[0]
    : f.deployment;
  const criterion = Array.isArray(f.criterion) ? f.criterion[0] : f.criterion;

  return {
    id: f.id,
    executionId: f.executionId,
    criterionId: f.criterionId,
    criterionQuestion: criterion?.question,
    workflowId: f.workflowId ?? undefined,
    workflowName: workflow?.name,
    deploymentId: f.deploymentId ?? undefined,
    deploymentVersion: deployment?.version,
    sentiment: f.sentiment as "positive" | "negative",
    comment: f.comment ?? undefined,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

export default feedbackRoutes;
