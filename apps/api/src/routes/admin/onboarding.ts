import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import {
  createDatabase,
  organizations,
  resolveOrganizationPlan,
  users,
} from "../../db";

const adminOnboardingRoutes = new Hono<ApiContext>();

// Funnel stages a user can reach using only data that lives in D1.
// Anything that requires an Analytics Engine round-trip (execution counts /
// success-vs-error breakdowns) is served by the separate /executions-summary
// endpoint so the funnel renders immediately while AE data fills in async.
type OnboardingStage =
  | "signed_up"
  | "tour_completed"
  | "workflow_created"
  | "workflow_executed"
  | "workflow_executed_ok";

// Stages a user can be "stuck" at — the terminal `workflow_executed_ok`
// stage is excluded because that user has activated.
const STUCK_STAGES = [
  "signed_up",
  "tour_completed",
  "workflow_created",
  "workflow_executed",
] as const;
type StuckStage = (typeof STUCK_STAGES)[number];

// Stage tabs cap at this many days; anything older counts as "dormant"
// and surfaces on the dedicated Dormant tab instead. Mutually-exclusive
// cohorts make each tab actionable: stage tabs = "still recent enough
// for a stage-specific nudge", dormant = "gone cold, re-engage".
const DORMANT_DAYS = 30;

// Virtual stage value accepted by /admin/onboarding — not a real funnel
// stage but a cohort union (any pre-activation user idle 30d+).
const LIST_STAGES = [...STUCK_STAGES, "dormant"] as const;

interface FunnelStage {
  reached: boolean;
  at: Date | null;
}

interface FunnelResponse {
  signedUp: FunnelStage;
  tourCompleted: FunnelStage;
  workflowCreated: FunnelStage;
  workflowExecuted: FunnelStage;
  workflowExecutedOk: FunnelStage;
  furthestStage: OnboardingStage;
  daysSinceAdvance: number;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function toStage(at: Date | null): FunnelStage {
  return { reached: at !== null, at };
}

// Build the WHERE filter for users currently stuck at a given stage in the
// window [cutoffNew, cutoffOld) — that is, the stage's stamp is present
// (createdAt for signed_up), every later-stage stamp is null, the stamp
// is older than `cutoffOld`, and (when provided) not older than
// `cutoffNew`. The upper bound is what keeps stage tabs disjoint from
// the dormant cohort.
function stuckFilter(stage: StuckStage, cutoffOld: Date, cutoffNew?: Date) {
  switch (stage) {
    case "signed_up":
      return and(
        isNull(users.tourCompleted),
        isNull(users.workflowCreated),
        isNull(users.workflowExecuted),
        isNull(users.workflowExecutedOk),
        lt(users.createdAt, cutoffOld),
        cutoffNew ? gte(users.createdAt, cutoffNew) : undefined
      );
    case "tour_completed":
      return and(
        isNotNull(users.tourCompleted),
        isNull(users.workflowCreated),
        isNull(users.workflowExecuted),
        isNull(users.workflowExecutedOk),
        lt(users.tourCompleted, cutoffOld),
        cutoffNew ? gte(users.tourCompleted, cutoffNew) : undefined
      );
    case "workflow_created":
      return and(
        isNotNull(users.workflowCreated),
        isNull(users.workflowExecuted),
        isNull(users.workflowExecutedOk),
        lt(users.workflowCreated, cutoffOld),
        cutoffNew ? gte(users.workflowCreated, cutoffNew) : undefined
      );
    case "workflow_executed":
      return and(
        isNotNull(users.workflowExecuted),
        isNull(users.workflowExecutedOk),
        lt(users.workflowExecuted, cutoffOld),
        cutoffNew ? gte(users.workflowExecuted, cutoffNew) : undefined
      );
  }
}

// Dormant cohort: any pre-activation user whose furthest funnel stamp is
// older than the dormancy cutoff. COALESCE picks the latest non-null
// stamp; createdAt is the floor since it's notNull.
function dormantFilter(cutoffOld: Date) {
  return and(
    isNull(users.workflowExecutedOk),
    sql`COALESCE(${users.workflowExecuted}, ${users.workflowCreated}, ${users.tourCompleted}, ${users.createdAt}) < ${Math.floor(cutoffOld.getTime() / 1000)}`
  );
}

// Date column whose value represents when the user landed in this stuck
// stage — used for ordering "oldest stuck first" and for daysSinceAdvance.
function stageEnteredColumn(stage: StuckStage) {
  switch (stage) {
    case "signed_up":
      return users.createdAt;
    case "tour_completed":
      return users.tourCompleted;
    case "workflow_created":
      return users.workflowCreated;
    case "workflow_executed":
      return users.workflowExecuted;
  }
}

/**
 * GET /admin/onboarding/users/:id/funnel
 *
 * Per-user onboarding funnel built from D1 only — every stage is a
 * nullable timestamp column on the users row, so this is a single
 * primary-key lookup with no joins.
 */
adminOnboardingRoutes.get("/users/:id/funnel", async (c) => {
  const db = createDatabase(c.env.DB);
  const userId = c.req.param("id");

  try {
    const [user] = await db
      .select({
        createdAt: users.createdAt,
        tourCompleted: users.tourCompleted,
        workflowCreated: users.workflowCreated,
        workflowExecuted: users.workflowExecuted,
        workflowExecutedOk: users.workflowExecutedOk,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const signedUp: FunnelStage = { reached: true, at: user.createdAt };
    const tourCompleted = toStage(user.tourCompleted);
    const workflowCreated = toStage(user.workflowCreated);
    const workflowExecuted = toStage(user.workflowExecuted);
    const workflowExecutedOk = toStage(user.workflowExecutedOk);

    let furthestStage: OnboardingStage = "signed_up";
    let furthestAt: Date = user.createdAt;
    if (tourCompleted.at) {
      furthestStage = "tour_completed";
      furthestAt = tourCompleted.at;
    }
    if (workflowCreated.at) {
      furthestStage = "workflow_created";
      furthestAt = workflowCreated.at;
    }
    if (workflowExecuted.at) {
      furthestStage = "workflow_executed";
      furthestAt = workflowExecuted.at;
    }
    if (workflowExecutedOk.at) {
      furthestStage = "workflow_executed_ok";
      furthestAt = workflowExecutedOk.at;
    }

    const response: FunnelResponse = {
      signedUp,
      tourCompleted,
      workflowCreated,
      workflowExecuted,
      workflowExecutedOk,
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

    // CF Analytics Engine SQL requires `COUNT()` with zero arguments —
    // `COUNT(*)` is rejected with `COUNT() function must have 0 arguments`.
    const sql = `
      SELECT blob4 AS status,
             COUNT() AS count,
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

/**
 * GET /admin/onboarding/summary?minDays=7
 *
 * Counts of users currently stuck at each of the four pre-activation stages,
 * where "stuck" means they reached the stage more than `minDays` days ago
 * and have not advanced. Implemented as a single D1 scan with conditional
 * aggregates so the dashboard panel renders in one round-trip.
 */
adminOnboardingRoutes.get(
  "/summary",
  zValidator(
    "query",
    z.object({
      minDays: z.coerce.number().min(0).max(365).default(7),
    })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const { minDays } = c.req.valid("query");

    try {
      // Drizzle's raw `sql` template binds non-Param chunks with the noop
      // encoder, so interpolating a JS `Date` would land in D1 as an
      // unsupported parameter type. The timestamp columns are stored as
      // unix-seconds integers (`mode: "timestamp"`), so we pre-encode the
      // cutoff ourselves to a number primitive and compare on that.
      const nowSec = Math.floor(Date.now() / 1000);
      const lowerCutoffSec = nowSec - minDays * 24 * 60 * 60;
      const dormantCutoffSec = nowSec - DORMANT_DAYS * 24 * 60 * 60;
      // Each stage count is now bounded by [lowerCutoff, dormantCutoff)
      // so users idle 30d+ only show up in the dormant count, never in
      // both a stage tab AND dormant.
      const [row] = await db
        .select({
          signedUp: sql<number>`COUNT(CASE WHEN ${users.tourCompleted} IS NULL AND ${users.workflowCreated} IS NULL AND ${users.workflowExecuted} IS NULL AND ${users.workflowExecutedOk} IS NULL AND ${users.createdAt} < ${lowerCutoffSec} AND ${users.createdAt} >= ${dormantCutoffSec} THEN 1 END)`,
          tourCompleted: sql<number>`COUNT(CASE WHEN ${users.tourCompleted} IS NOT NULL AND ${users.workflowCreated} IS NULL AND ${users.workflowExecuted} IS NULL AND ${users.workflowExecutedOk} IS NULL AND ${users.tourCompleted} < ${lowerCutoffSec} AND ${users.tourCompleted} >= ${dormantCutoffSec} THEN 1 END)`,
          workflowCreated: sql<number>`COUNT(CASE WHEN ${users.workflowCreated} IS NOT NULL AND ${users.workflowExecuted} IS NULL AND ${users.workflowExecutedOk} IS NULL AND ${users.workflowCreated} < ${lowerCutoffSec} AND ${users.workflowCreated} >= ${dormantCutoffSec} THEN 1 END)`,
          workflowExecuted: sql<number>`COUNT(CASE WHEN ${users.workflowExecuted} IS NOT NULL AND ${users.workflowExecutedOk} IS NULL AND ${users.workflowExecuted} < ${lowerCutoffSec} AND ${users.workflowExecuted} >= ${dormantCutoffSec} THEN 1 END)`,
          dormant: sql<number>`COUNT(CASE WHEN ${users.workflowExecutedOk} IS NULL AND COALESCE(${users.workflowExecuted}, ${users.workflowCreated}, ${users.tourCompleted}, ${users.createdAt}) < ${dormantCutoffSec} THEN 1 END)`,
        })
        .from(users);

      return c.json({
        minDays,
        dormantDays: DORMANT_DAYS,
        counts: {
          signed_up: Number(row?.signedUp ?? 0),
          tour_completed: Number(row?.tourCompleted ?? 0),
          workflow_created: Number(row?.workflowCreated ?? 0),
          workflow_executed: Number(row?.workflowExecuted ?? 0),
          dormant: Number(row?.dormant ?? 0),
        },
      });
    } catch (error) {
      console.error("Error fetching stuck users summary:", error);
      return c.json({ error: "Failed to fetch stuck users summary" }, 500);
    }
  }
);

/**
 * GET /admin/onboarding?stage=workflow_created&minDays=7&page=1&limit=20
 *
 * Paginated list of users stuck at a single stage, oldest-stuck first so the
 * admin can triage the most overdue cases. Returns the same per-user shape
 * the admin users list uses, plus `furthestStageAt` so the UI can show
 * "stuck since" without recomputing.
 */
adminOnboardingRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      stage: z.enum(LIST_STAGES),
      minDays: z.coerce.number().min(0).max(365).default(7),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
    })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const { stage, minDays, page, limit } = c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      const now = Date.now();
      const dormantCutoff = new Date(now - DORMANT_DAYS * 24 * 60 * 60 * 1000);

      // Dormant cohort is a union across stages — order by COALESCE of
      // the latest stamp so the oldest-cold users surface first.
      if (stage === "dormant") {
        const filter = dormantFilter(dormantCutoff);
        const dormancyAt = sql<Date>`COALESCE(${users.workflowExecuted}, ${users.workflowCreated}, ${users.tourCompleted}, ${users.createdAt})`;

        const [countRow] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(filter);

        const rows = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            avatarUrl: users.avatarUrl,
            subscriptionStatus: organizations.subscriptionStatus,
            currentPeriodEnd: organizations.currentPeriodEnd,
            role: users.role,
            developerMode: users.developerMode,
            tourCompleted: users.tourCompleted,
            workflowCreated: users.workflowCreated,
            workflowExecuted: users.workflowExecuted,
            workflowExecutedOk: users.workflowExecutedOk,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
            furthestStageAt: dormancyAt,
          })
          .from(users)
          .innerJoin(organizations, eq(users.organizationId, organizations.id))
          .where(filter)
          .orderBy(asc(dormancyAt))
          .limit(limit)
          .offset(offset);

        const list = rows.map(
          ({ subscriptionStatus, currentPeriodEnd, furthestStageAt, ...u }) => {
            // SQLite returns the COALESCE result as a unix-seconds integer
            // (since the underlying columns are stored that way), but
            // Drizzle does not know to wrap it as a Date — coerce here.
            const enteredAt =
              furthestStageAt instanceof Date
                ? furthestStageAt
                : new Date(Number(furthestStageAt) * 1000);
            return {
              ...u,
              plan: resolveOrganizationPlan({
                subscriptionStatus,
                currentPeriodEnd,
              }),
              furthestStage: "dormant" as const,
              furthestStageAt: enteredAt,
              daysSinceAdvance: Math.max(
                0,
                Math.floor((now - enteredAt.getTime()) / (24 * 60 * 60 * 1000))
              ),
            };
          }
        );

        return c.json({
          users: list,
          pagination: {
            page,
            limit,
            total: Number(countRow?.count ?? 0),
            totalPages: Math.ceil(Number(countRow?.count ?? 0) / limit),
          },
        });
      }

      const lowerCutoff = new Date(now - minDays * 24 * 60 * 60 * 1000);
      const filter = stuckFilter(stage, lowerCutoff, dormantCutoff);
      const enteredAt = stageEnteredColumn(stage);

      const [countRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(filter);

      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
          subscriptionStatus: organizations.subscriptionStatus,
          currentPeriodEnd: organizations.currentPeriodEnd,
          role: users.role,
          developerMode: users.developerMode,
          tourCompleted: users.tourCompleted,
          workflowCreated: users.workflowCreated,
          workflowExecuted: users.workflowExecuted,
          workflowExecutedOk: users.workflowExecutedOk,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          furthestStageAt: enteredAt,
        })
        .from(users)
        .innerJoin(organizations, eq(users.organizationId, organizations.id))
        .where(filter)
        .orderBy(asc(enteredAt))
        .limit(limit)
        .offset(offset);

      const list = rows.map(
        ({ subscriptionStatus, currentPeriodEnd, furthestStageAt, ...u }) => {
          // The stuck filter guarantees the entered-at column is non-null
          // for every row in this stage (and for signed_up it's createdAt,
          // which is itself notNull). Assert + assume here.
          const enteredAt = furthestStageAt as Date;
          return {
            ...u,
            plan: resolveOrganizationPlan({
              subscriptionStatus,
              currentPeriodEnd,
            }),
            furthestStage: stage,
            furthestStageAt: enteredAt,
            daysSinceAdvance: Math.max(
              0,
              Math.floor((now - enteredAt.getTime()) / (24 * 60 * 60 * 1000))
            ),
          };
        }
      );

      return c.json({
        users: list,
        pagination: {
          page,
          limit,
          total: Number(countRow?.count ?? 0),
          totalPages: Math.ceil(Number(countRow?.count ?? 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching stuck users:", error);
      return c.json({ error: "Failed to fetch stuck users" }, 500);
    }
  }
);

export default adminOnboardingRoutes;
