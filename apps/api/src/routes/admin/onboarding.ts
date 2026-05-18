import { count, eq, min } from "drizzle-orm";
import { Hono } from "hono";

import { ApiContext } from "../../context";
import { createDatabase, users, workflows } from "../../db";

const adminOnboardingRoutes = new Hono<ApiContext>();

// Funnel stages a user can reach using only data that lives in D1.
// Anything that requires an Analytics Engine round-trip (executions) is
// served by the separate /executions-summary endpoint so the funnel
// renders immediately while execution counts fill in asynchronously.
type FurthestSqliteStage = "signed_up" | "workflow_created";

interface FunnelStage {
  reached: boolean;
  at: Date | null;
}

interface FunnelResponse {
  signedUp: FunnelStage;
  workflowCreated: FunnelStage & { count: number };
  furthestStage: FurthestSqliteStage;
  daysSinceAdvance: number;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

/**
 * GET /admin/onboarding/users/:id/funnel
 *
 * Per-user onboarding funnel built from D1 only. Attribution to a user is
 * via `users.organizationId` — for multi-member orgs this reads as
 * "the user's primary org has activity", which is correct for solo
 * onboarding and acknowledged in admin UI copy.
 */
adminOnboardingRoutes.get("/users/:id/funnel", async (c) => {
  const db = createDatabase(c.env.DB);
  const userId = c.req.param("id");

  try {
    const [user] = await db
      .select({
        id: users.id,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const [workflowAgg] = await db
      .select({
        firstCreatedAt: min(workflows.createdAt),
        count: count(),
      })
      .from(workflows)
      .where(eq(workflows.organizationId, user.organizationId));

    const workflowCount = workflowAgg?.count ?? 0;
    const firstWorkflowCreatedAt = workflowAgg?.firstCreatedAt ?? null;

    const signedUp: FunnelStage = { reached: true, at: user.createdAt };
    const workflowCreated = {
      reached: workflowCount > 0,
      at: firstWorkflowCreatedAt,
      count: workflowCount,
    };

    let furthestStage: FurthestSqliteStage = "signed_up";
    let furthestAt: Date = user.createdAt;
    if (workflowCreated.reached && workflowCreated.at) {
      furthestStage = "workflow_created";
      furthestAt = workflowCreated.at;
    }

    const response: FunnelResponse = {
      signedUp,
      workflowCreated,
      furthestStage,
      daysSinceAdvance: daysBetween(furthestAt, new Date()),
    };

    return c.json(response);
  } catch (error) {
    console.error("Error fetching user onboarding funnel:", error);
    return c.json({ error: "Failed to fetch onboarding funnel" }, 500);
  }
});

interface ExecutionsSummaryResponse {
  firstExecutionAt: Date | null;
  firstSuccessAt: Date | null;
  totalExecutions: number;
  successCount: number;
  errorCount: number;
}

/**
 * GET /admin/onboarding/users/:id/executions-summary
 *
 * Pulls execution stats from Cloudflare Analytics Engine for the user's
 * primary org. Issued as a single grouped query so we make one network
 * round-trip per request.
 */
adminOnboardingRoutes.get("/users/:id/executions-summary", async (c) => {
  const db = createDatabase(c.env.DB);
  const userId = c.req.param("id");

  try {
    const [user] = await db
      .select({ organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const empty: ExecutionsSummaryResponse = {
      firstExecutionAt: null,
      firstSuccessAt: null,
      totalExecutions: 0,
      successCount: 0,
      errorCount: 0,
    };

    if (!c.env.CLOUDFLARE_ACCOUNT_ID || !c.env.CLOUDFLARE_API_TOKEN) {
      return c.json(empty);
    }

    // organizationId comes from the DB (UUID format) so it's safe, but we
    // still validate the shape before interpolating into the AE SQL.
    if (!/^[a-zA-Z0-9_-]+$/.test(user.organizationId)) {
      return c.json(empty);
    }

    const env = c.env.CLOUDFLARE_ENV || "development";
    const dataset =
      env === "production"
        ? "dafthunk_executions_production"
        : "dafthunk_executions_development";

    const sql = `
      SELECT blob4 AS status,
             COUNT(*) AS count,
             MIN(double2) AS first_started_at
      FROM ${dataset}
      WHERE index1 = '${user.organizationId}'
      GROUP BY status
    `;

    const url = `https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`;

    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.env.CLOUDFLARE_API_TOKEN}` },
      body: sql,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(
        `Admin onboarding executions-summary failed: ${response.status} - ${error}`
      );
      return c.json(empty);
    }

    const result = (await response.json()) as {
      data?: Array<{ status: string; count: number; first_started_at: number }>;
    };
    const rows = result.data || [];

    let totalExecutions = 0;
    let successCount = 0;
    let errorCount = 0;
    let firstExecutionMs: number | null = null;
    let firstSuccessMs: number | null = null;

    for (const row of rows) {
      const rowCount = Number(row.count) || 0;
      totalExecutions += rowCount;
      if (row.status === "completed") successCount += rowCount;
      if (row.status === "error") errorCount += rowCount;

      const firstMs = row.first_started_at
        ? Number(row.first_started_at)
        : null;
      if (
        firstMs &&
        (firstExecutionMs === null || firstMs < firstExecutionMs)
      ) {
        firstExecutionMs = firstMs;
      }
      if (
        row.status === "completed" &&
        firstMs &&
        (firstSuccessMs === null || firstMs < firstSuccessMs)
      ) {
        firstSuccessMs = firstMs;
      }
    }

    const summary: ExecutionsSummaryResponse = {
      firstExecutionAt: firstExecutionMs ? new Date(firstExecutionMs) : null,
      firstSuccessAt: firstSuccessMs ? new Date(firstSuccessMs) : null,
      totalExecutions,
      successCount,
      errorCount,
    };

    return c.json(summary);
  } catch (error) {
    console.error("Error fetching user executions summary:", error);
    return c.json({ error: "Failed to fetch executions summary" }, 500);
  }
});

export default adminOnboardingRoutes;
