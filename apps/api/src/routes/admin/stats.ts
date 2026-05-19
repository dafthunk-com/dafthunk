import { zValidator } from "@hono/zod-validator";
import { count, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext, Bindings } from "../../context";
import {
  createDatabase,
  memberships,
  organizations,
  users,
  workflows,
} from "../../db";

const adminStatsRoutes = new Hono<ApiContext>();

/**
 * GET /admin/stats
 *
 * Get platform-wide statistics for the admin dashboard
 */
adminStatsRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);

  try {
    // Get current date info for time-based queries
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Run all count queries in parallel
    const [
      totalUsersResult,
      totalOrganizationsResult,
      totalWorkflowsResult,
      recentSignupsResult,
      activeUsersResult,
    ] = await Promise.all([
      // Total users
      db
        .select({ count: count() })
        .from(users),
      // Total organizations
      db
        .select({ count: count() })
        .from(organizations),
      // Total workflows
      db
        .select({ count: count() })
        .from(workflows),
      // Recent signups (last 7 days)
      db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, sevenDaysAgo)),
      // Active users (users who are members of orgs with workflows updated in last 24h)
      db
        .select({ count: sql<number>`COUNT(DISTINCT ${memberships.userId})` })
        .from(memberships)
        .innerJoin(
          workflows,
          sql`${memberships.organizationId} = ${workflows.organizationId}`
        )
        .where(gte(workflows.updatedAt, oneDayAgo)),
    ]);

    return c.json({
      totalUsers: totalUsersResult[0]?.count ?? 0,
      totalOrganizations: totalOrganizationsResult[0]?.count ?? 0,
      totalWorkflows: totalWorkflowsResult[0]?.count ?? 0,
      recentSignups: recentSignupsResult[0]?.count ?? 0,
      activeUsers24h: activeUsersResult[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return c.json({ error: "Failed to fetch admin stats" }, 500);
  }
});

interface DailyCountPoint {
  date: string;
  count: number;
}

interface DailyExecutionPoint extends DailyCountPoint {
  successCount: number;
  errorCount: number;
}

function toDayKey(d: Date): string {
  // Build a stable YYYY-MM-DD key in UTC so the frontend can render any
  // timezone without us baking the request locale into the response.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildEmptyBuckets(from: Date, days: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    keys.push(toDayKey(d));
  }
  return keys;
}

function densifyCounts(
  buckets: string[],
  rows: Array<{ date: string; count: number }>
): DailyCountPoint[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.date, Number(row.count) || 0);
  }
  return buckets.map((date) => ({ date, count: map.get(date) ?? 0 }));
}

/**
 * GET /admin/stats/timeseries?days=30
 *
 * Bundled time-series for the admin dashboard: daily signups, workflow
 * creations, and executions (with success/error breakdown). Server-side
 * zero-fill means the frontend can render gaps as zeros without extra
 * logic.
 */
adminStatsRoutes.get(
  "/timeseries",
  zValidator(
    "query",
    z.object({
      days: z.coerce.number().int().min(1).max(180).default(30),
    })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const { days } = c.req.valid("query");

    try {
      // Range ends at end-of-today (UTC) and starts `days - 1` days back,
      // so a request for 30 days yields exactly 30 buckets including today.
      const now = new Date();
      const to = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999
        )
      );
      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - (days - 1));
      from.setUTCHours(0, 0, 0, 0);

      const buckets = buildEmptyBuckets(from, days);

      const userDayBucket = sql<string>`strftime('%Y-%m-%d', ${users.createdAt}, 'unixepoch')`;
      const workflowDayBucket = sql<string>`strftime('%Y-%m-%d', ${workflows.createdAt}, 'unixepoch')`;

      const [signupRows, workflowRows] = await Promise.all([
        db
          .select({ date: userDayBucket, count: count() })
          .from(users)
          .where(gte(users.createdAt, from))
          .groupBy(userDayBucket),
        db
          .select({ date: workflowDayBucket, count: count() })
          .from(workflows)
          .where(gte(workflows.createdAt, from))
          .groupBy(workflowDayBucket),
      ]);

      const signups = densifyCounts(buckets, signupRows);
      const workflowsCreated = densifyCounts(buckets, workflowRows);

      // Executions live in Cloudflare Analytics Engine, indexed per org.
      // Group by date bucket + status so we can split success/error.
      const executions: DailyExecutionPoint[] = await fetchExecutionsSeries(
        c.env,
        from,
        buckets
      );

      return c.json({
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
          days,
        },
        series: {
          signups,
          workflowsCreated,
          executions,
        },
      });
    } catch (error) {
      console.error("Error fetching admin timeseries:", error);
      return c.json({ error: "Failed to fetch timeseries" }, 500);
    }
  }
);

async function fetchExecutionsSeries(
  env: Bindings,
  from: Date,
  buckets: string[]
): Promise<DailyExecutionPoint[]> {
  const emptySeries: DailyExecutionPoint[] = buckets.map((date) => ({
    date,
    count: 0,
    successCount: 0,
    errorCount: 0,
  }));

  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    return emptySeries;
  }

  const dataset =
    (env.CLOUDFLARE_ENV || "development") === "production"
      ? "dafthunk_executions_production"
      : "dafthunk_executions_development";

  // Use `toStartOfInterval` (the canonical CF AE bucketing function shown
  // in the docs) instead of `formatDateTime` + `toDateTime`, which both
  // returned zero rows in practice. The returned `day` is a DateTime
  // serialized as e.g. `"2026-04-20 00:00:00"`; we slice the first 10
  // chars to recover the `YYYY-MM-DD` bucket key. `from` is always a
  // server-derived `Date.toISOString()` (not user input), so direct
  // interpolation is safe.
  const fromTs = from.toISOString().slice(0, 19).replace("T", " ");
  const aeSql = `
    SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY, 'Etc/UTC') AS day,
           blob4 AS status,
           COUNT(*) AS count
    FROM ${dataset}
    WHERE timestamp >= '${fromTs}'
    GROUP BY day, status
  `;

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
    body: aeSql,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(
      `Admin timeseries executions query failed: ${response.status} - ${error}`,
      { sql: aeSql }
    );
    return emptySeries;
  }

  // Temporary diagnostic logging while we track down why the executions
  // chart returns empty buckets in production. Remove once verified.
  const rawBody = await response.text();
  console.log("[admin/stats/timeseries] AE SQL:", aeSql);
  console.log("[admin/stats/timeseries] AE response:", rawBody);

  let result: { data?: Array<{ day: string; status: string; count: number }> };
  try {
    result = JSON.parse(rawBody);
  } catch (parseError) {
    console.error(
      "[admin/stats/timeseries] Failed to parse AE response JSON",
      parseError
    );
    return emptySeries;
  }
  const rows = result.data || [];

  const byDate = new Map<
    string,
    { count: number; successCount: number; errorCount: number }
  >();
  for (const row of rows) {
    const date = String(row.day || "").slice(0, 10);
    if (!date) continue;
    const entry = byDate.get(date) ?? {
      count: 0,
      successCount: 0,
      errorCount: 0,
    };
    const rowCount = Number(row.count) || 0;
    entry.count += rowCount;
    if (row.status === "completed") entry.successCount += rowCount;
    if (row.status === "error") entry.errorCount += rowCount;
    byDate.set(date, entry);
  }

  return buckets.map((date) => {
    const e = byDate.get(date);
    return {
      date,
      count: e?.count ?? 0,
      successCount: e?.successCount ?? 0,
      errorCount: e?.errorCount ?? 0,
    };
  });
}

export default adminStatsRoutes;
