import {
  CreateEvaluationRequest,
  CreateEvaluationResponse,
  GetEvaluationResponse,
  ListEvaluationsResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { EvaluationService } from "../services/evaluation-service";

const evaluationRoutes = new Hono<ApiContext>();

// Apply JWT middleware to all evaluation routes
evaluationRoutes.use("*", jwtMiddleware);

/**
 * Create and run an evaluation
 */
evaluationRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Evaluation name is required"),
      deploymentId: z.string().uuid("Deployment ID must be a valid UUID"),
      testCases: z
        .array(
          z.object({
            id: z.string(),
            input: z.record(z.string(), z.record(z.string(), z.any())),
            expected: z.record(z.string(), z.record(z.string(), z.any())),
            metadata: z.record(z.string(), z.any()).optional(),
          })
        )
        .min(1, "At least one test case is required"),
    }) as z.ZodType<CreateEvaluationRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const jwtPayload = c.get("jwtPayload")!;
    const userId = jwtPayload.sub;
    const { name, deploymentId, testCases } = c.req.valid("json");

    const evaluationService = new EvaluationService(c.env);

    try {
      const evaluation = await evaluationService.createEvaluation(
        name,
        deploymentId,
        testCases,
        organizationId,
        userId
      );

      const response: CreateEvaluationResponse = {
        id: evaluation.id,
        name: evaluation.name,
        deploymentId: evaluation.deploymentId,
        status: evaluation.status,
        testCaseCount: testCases.length,
        createdAt: evaluation.createdAt,
      };

      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating evaluation:", error);
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to create evaluation",
        },
        500
      );
    }
  }
);

/**
 * Get an evaluation by ID
 */
evaluationRoutes.get("/:id", async (c) => {
  const organizationId = c.get("organizationId")!;
  const id = c.req.param("id");

  const evaluationService = new EvaluationService(c.env);

  try {
    const evaluation = await evaluationService.getEvaluation(
      id,
      organizationId
    );

    if (!evaluation) {
      return c.json({ error: "Evaluation not found" }, 404);
    }

    // Get results if evaluation is completed
    let results = undefined;
    if (evaluation.status === "completed") {
      try {
        results = await evaluationService.getEvaluationResults(
          id,
          organizationId
        );
      } catch (error) {
        console.error("Error loading evaluation results:", error);
        // Continue without results
      }
    }

    // Parse scores JSON
    let scores = undefined;
    if (evaluation.scores) {
      try {
        scores = JSON.parse(evaluation.scores);
      } catch (error) {
        console.error("Error parsing scores:", error);
      }
    }

    const response: GetEvaluationResponse = {
      evaluation: {
        id: evaluation.id,
        name: evaluation.name,
        deploymentId: evaluation.deploymentId,
        status: evaluation.status,
        scores,
        error: evaluation.error ?? undefined,
        createdAt: evaluation.createdAt,
        completedAt: evaluation.completedAt ?? undefined,
      },
      results,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error retrieving evaluation:", error);
    return c.json({ error: "Failed to retrieve evaluation" }, 500);
  }
});

/**
 * List evaluations for the current organization
 */
evaluationRoutes.get("/", async (c) => {
  const organizationId = c.get("organizationId")!;

  const evaluationService = new EvaluationService(c.env);

  try {
    const evaluations = await evaluationService.listEvaluations(organizationId);

    // Parse scores for each evaluation
    const evaluationsWithScores = evaluations.map((evaluation) => {
      let scores = undefined;
      if (evaluation.scores) {
        try {
          scores = JSON.parse(evaluation.scores);
        } catch (error) {
          console.error("Error parsing scores:", error);
        }
      }

      return {
        id: evaluation.id,
        name: evaluation.name,
        deploymentId: evaluation.deploymentId,
        status: evaluation.status,
        scores,
        error: evaluation.error ?? undefined,
        createdAt: evaluation.createdAt,
        completedAt: evaluation.completedAt ?? undefined,
      };
    });

    const response: ListEvaluationsResponse = {
      evaluations: evaluationsWithScores,
    };

    return c.json(response);
  } catch (error) {
    console.error("Error listing evaluations:", error);
    return c.json({ error: "Failed to list evaluations" }, 500);
  }
});

export default evaluationRoutes;
