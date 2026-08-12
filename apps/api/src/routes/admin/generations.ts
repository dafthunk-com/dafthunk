import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import { createDatabase, organizations } from "../../db";

const adminGenerationsRoutes = new Hono<ApiContext>();

/**
 * What the generator did, across every workspace.
 *
 * Metadata only, by construction — the write side records no prompt text and
 * no graph contents, so nothing here is a person's words. See
 * `GenerationSession.recordGeneration` for why.
 *
 * The columns are positional because Analytics Engine has no schema; the map
 * below is the schema, and it has to be read together with the write site.
 *
 *   index1  organizationId        double1  durationMs
 *   blob1   sessionId             double2  repairs
 *   blob2   workflowId            double3  nodeCount
 *   blob3   outcome               double4  inputTokens
 *   blob4   stage that failed     double5  outputTokens
 *   blob5   fatal codes           double6  turn
 *   blob6   trigger
 *   blob7   node types
 *   blob8   error code
 */

/**
 * Escapes a value for an Analytics Engine SQL literal.
 *
 * Zod has already constrained every filter below to the same character class;
 * this is the second lock, kept because the query is string-built and one
 * forgotten `.regex()` upstream would otherwise be an injection.
 */
function sanitizeForAnalyticsEngine(value: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid value format: ${value}`);
  }
  return value;
}

adminGenerationsRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      organizationId: z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
      outcome: z
        .enum(["ok", "partial", "failed", "crashed", "refused"])
        .optional(),
      /** The stage that broke, for the view worth opening first. */
      stage: z
        .enum(["select", "draft", "hydrate", "validate", "save", "run"])
        .optional(),
      trigger: z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
    })
  ),
  async (c) => {
    const { page, limit, organizationId, outcome, stage, trigger } =
      c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      const env = c.env.CLOUDFLARE_ENV || "development";
      const dataset =
        env === "production"
          ? "dafthunk_generations_production"
          : "dafthunk_generations_development";

      const whereConditions: string[] = [];
      if (organizationId) {
        whereConditions.push(
          `index1 = '${sanitizeForAnalyticsEngine(organizationId)}'`
        );
      }
      if (outcome) {
        whereConditions.push(`blob3 = '${outcome}'`);
      }
      if (stage) {
        whereConditions.push(`blob4 = '${stage}'`);
      }
      if (trigger) {
        whereConditions.push(
          `blob6 = '${sanitizeForAnalyticsEngine(trigger)}'`
        );
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // `_sample_interval` is selected rather than ignored: Analytics Engine
      // samples under load, and a row then stands for that many generations.
      // A reader that counts rows undercounts exactly when the numbers start
      // to matter.
      const sql = `
        SELECT *, _sample_interval
        FROM ${dataset}
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      if (!c.env.CLOUDFLARE_ACCOUNT_ID || !c.env.CLOUDFLARE_API_TOKEN) {
        return c.json({
          error: "Analytics Engine credentials not configured",
          generations: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${c.env.CLOUDFLARE_API_TOKEN}` },
          body: sql,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error(
          `Admin generations query failed: ${response.status} - ${error}`
        );
        return c.json({
          error: "Failed to query generations",
          generations: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }

      const result = (await response.json()) as { data?: unknown[] };
      const rows = (result.data ?? []) as Array<
        Record<string, string | number>
      >;

      const db = createDatabase(c.env.DB);
      const orgsMap = new Map<string, string>();
      if (rows.length > 0) {
        const orgs = await db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations);
        orgs.forEach((org) => orgsMap.set(org.id, org.name));
      }

      const split = (value: unknown): string[] =>
        typeof value === "string" && value.length > 0 ? value.split(",") : [];

      const generations = rows.map((row) => ({
        sessionId: row.blob1,
        workflowId: row.blob2 || undefined,
        outcome: row.blob3,
        failedStage: row.blob4 || undefined,
        fatalCodes: split(row.blob5),
        trigger: row.blob6 || undefined,
        nodeTypes: split(row.blob7),
        errorCode: row.blob8 || undefined,
        organizationId: row.index1,
        organizationName:
          orgsMap.get(String(row.index1)) ?? "Unknown Organization",
        durationMs: Number(row.double1 ?? 0),
        repairs: Number(row.double2 ?? 0),
        nodeCount: Number(row.double3 ?? 0),
        inputTokens: Number(row.double4 ?? 0),
        outputTokens: Number(row.double5 ?? 0),
        turn: Number(row.double6 ?? 0),
        /** How many generations this row stands for once sampling is applied. */
        weight: Number(row._sample_interval ?? 1),
        timestamp: new Date(String(row.timestamp)),
      }));

      return c.json({
        generations,
        pagination: {
          page,
          limit,
          // Analytics Engine gives no cheap total; the caller pages until short.
          total: generations.length,
          totalPages: 1,
        },
      });
    } catch (error) {
      console.error("Error fetching admin generations:", error);
      return c.json({ error: "Failed to fetch generations" }, 500);
    }
  }
);

export default adminGenerationsRoutes;
