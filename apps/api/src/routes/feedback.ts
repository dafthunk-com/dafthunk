import {
  CreateExecutionFeedbackRequest,
  CreateExecutionFeedbackResponse,
  ExecutionFeedback,
  ListExecutionFeedbackResponse,
  UpdateExecutionFeedbackRequest,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase } from "../db";
import { feedback, type FeedbackInsert, type FeedbackRow } from "../db/schema";
import { ExecutionStore } from "../stores/execution-store";

const feedbackRoutes = new Hono<ApiContext>();

// Apply JWT middleware to all routes
feedbackRoutes.use("*", jwtMiddleware);

/**
 * Create feedback for an execution
 */
feedbackRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      executionId: z.string().min(1, "Execution ID is required"),
      sentiment: z.enum(["positive", "negative"]),
      comment: z.string().optional(),
    }) as z.ZodType<CreateExecutionFeedbackRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const jwtPayload = c.get("jwtPayload")!;
    const userId = jwtPayload.sub;
    const { executionId, sentiment, comment } = c.req.valid("json");

    const db = createDatabase(c.env.DB);
    const executionStore = new ExecutionStore(c.env);

    try {
      // Get execution to find deploymentId and verify access
      const execution = await executionStore.get(executionId, organizationId);
      if (!execution) {
        return c.json({ error: "Execution not found" }, 404);
      }

      // Check if feedback already exists for this execution
      const existing = await db.query.feedback.findFirst({
        where: eq(feedback.executionId, executionId),
      });

      if (existing) {
        return c.json(
          { error: "Feedback already exists for this execution" },
          409
        );
      }

      const feedbackId = uuid();
      const now = new Date();

      const feedbackData: FeedbackInsert = {
        id: feedbackId,
        executionId,
        workflowId: execution.workflowId || null,
        deploymentId: execution.deploymentId || null,
        organizationId,
        userId,
        sentiment,
        comment: comment || null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(feedback).values(feedbackData);

      const response: CreateExecutionFeedbackResponse = {
        id: feedbackId,
        executionId,
        workflowId: execution.workflowId || undefined,
        deploymentId: execution.deploymentId || undefined,
        sentiment,
        comment,
        createdAt: now,
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating execution feedback:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to create execution feedback",
        },
        500
      );
    }
  }
);

/**
 * Get feedback by execution ID
 */
feedbackRoutes.get("/execution/:executionId", async (c) => {
  const organizationId = c.get("organizationId")!;
  const executionId = c.req.param("executionId");

  const db = createDatabase(c.env.DB);

  try {
    const feedbackData = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.executionId, executionId),
        eq(feedback.organizationId, organizationId)
      ),
      with: {
        workflow: {
          columns: {
            name: true,
          },
        },
      },
    });

    if (!feedbackData) {
      return c.json({ error: "Execution feedback not found" }, 404);
    }

    const workflow = feedbackData.workflow as { name: string } | null;
    const response: ExecutionFeedback = {
      id: feedbackData.id,
      executionId: feedbackData.executionId,
      workflowId: feedbackData.workflowId ?? undefined,
      workflowName: workflow?.name,
      deploymentId: feedbackData.deploymentId ?? undefined,
      sentiment: feedbackData.sentiment,
      comment: feedbackData.comment ?? undefined,
      createdAt: feedbackData.createdAt,
      updatedAt: feedbackData.updatedAt,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error retrieving execution feedback:", error);
    return c.json({ error: "Failed to retrieve execution feedback" }, 500);
  }
});

/**
 * Update execution feedback
 */
feedbackRoutes.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      sentiment: z.enum(["positive", "negative"]).optional(),
      comment: z.string().optional(),
    }) as z.ZodType<UpdateExecutionFeedbackRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const id = c.req.param("id");
    const { sentiment, comment } = c.req.valid("json");

    const db = createDatabase(c.env.DB);

    try {
      // Verify feedback exists and belongs to organization
      const existing = await db.query.feedback.findFirst({
        where: and(
          eq(feedback.id, id),
          eq(feedback.organizationId, organizationId)
        ),
      });

      if (!existing) {
        return c.json({ error: "Execution feedback not found" }, 404);
      }

      const updates: Partial<FeedbackRow> = {
        updatedAt: new Date(),
      };

      if (sentiment !== undefined) {
        updates.sentiment = sentiment;
      }
      if (comment !== undefined) {
        updates.comment = comment || null;
      }

      await db.update(feedback).set(updates).where(eq(feedback.id, id));

      const updated = await db.query.feedback.findFirst({
        where: eq(feedback.id, id),
        with: {
          workflow: {
            columns: {
              name: true,
            },
          },
        },
      });

      const updatedWorkflow = updated!.workflow as { name: string } | null;
      const response: ExecutionFeedback = {
        id: updated!.id,
        executionId: updated!.executionId,
        workflowId: updated!.workflowId ?? undefined,
        workflowName: updatedWorkflow?.name,
        deploymentId: updated!.deploymentId ?? undefined,
        sentiment: updated!.sentiment,
        comment: updated!.comment ?? undefined,
        createdAt: updated!.createdAt,
        updatedAt: updated!.updatedAt,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error updating execution feedback:", error);
      return c.json({ error: "Failed to update execution feedback" }, 500);
    }
  }
);

/**
 * Delete execution feedback
 */
feedbackRoutes.delete("/:id", async (c) => {
  const organizationId = c.get("organizationId")!;
  const id = c.req.param("id");

  const db = createDatabase(c.env.DB);

  try {
    // Verify feedback exists and belongs to organization
    const existing = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.id, id),
        eq(feedback.organizationId, organizationId)
      ),
    });

    if (!existing) {
      return c.json({ error: "Execution feedback not found" }, 404);
    }

    await db.delete(feedback).where(eq(feedback.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting execution feedback:", error);
    return c.json({ error: "Failed to delete execution feedback" }, 500);
  }
});

/**
 * List feedback for a deployment
 */
feedbackRoutes.get("/deployment/:deploymentId", async (c) => {
  const organizationId = c.get("organizationId")!;
  const deploymentId = c.req.param("deploymentId");

  const db = createDatabase(c.env.DB);

  try {
    const feedbackRecords = await db.query.feedback.findMany({
      where: and(
        eq(feedback.deploymentId, deploymentId),
        eq(feedback.organizationId, organizationId)
      ),
      orderBy: [desc(feedback.createdAt)],
      with: {
        workflow: {
          columns: {
            name: true,
          },
        },
      },
    });

    const response: ListExecutionFeedbackResponse = {
      feedback: feedbackRecords.map((f) => {
        const workflow = f.workflow as { name: string } | null;
        return {
          id: f.id,
          executionId: f.executionId,
          workflowId: f.workflowId ?? undefined,
          workflowName: workflow?.name,
          deploymentId: f.deploymentId ?? undefined,
          sentiment: f.sentiment,
          comment: f.comment ?? undefined,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        };
      }),
    };

    return c.json(response);
  } catch (error) {
    console.error("Error listing execution feedback:", error);
    return c.json({ error: "Failed to list execution feedback" }, 500);
  }
});

/**
 * List all feedback for the organization
 */
feedbackRoutes.get("/", async (c) => {
  const organizationId = c.get("organizationId")!;

  const db = createDatabase(c.env.DB);

  try {
    const feedbackRecords = await db.query.feedback.findMany({
      where: eq(feedback.organizationId, organizationId),
      orderBy: [desc(feedback.createdAt)],
      with: {
        workflow: {
          columns: {
            name: true,
          },
        },
      },
    });

    const response: ListExecutionFeedbackResponse = {
      feedback: feedbackRecords.map((f) => {
        const workflow = f.workflow as { name: string } | null;
        return {
          id: f.id,
          executionId: f.executionId,
          workflowId: f.workflowId ?? undefined,
          workflowName: workflow?.name,
          deploymentId: f.deploymentId ?? undefined,
          sentiment: f.sentiment,
          comment: f.comment ?? undefined,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        };
      }),
    };

    return c.json(response);
  } catch (error) {
    console.error("Error listing execution feedback:", error);
    return c.json({ error: "Failed to list execution feedback" }, 500);
  }
});

export default feedbackRoutes;
