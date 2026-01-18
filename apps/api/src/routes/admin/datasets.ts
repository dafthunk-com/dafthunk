import { zValidator } from "@hono/zod-validator";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import { createDatabase, datasets, organizations } from "../../db";

const adminDatasetsRoutes = new Hono<ApiContext>();

/**
 * GET /admin/datasets
 *
 * List all datasets across all organizations with pagination and optional search
 */
adminDatasetsRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      search: z.string().optional(),
      organizationId: z.string().optional(),
    })
  ),
  async (c) => {
    const db = createDatabase(c.env.DB);
    const { page, limit, search, organizationId } = c.req.valid("query");
    const offset = (page - 1) * limit;

    try {
      const conditions = [];

      if (search) {
        conditions.push(
          or(
            like(datasets.name, `%${search}%`),
            like(datasets.handle, `%${search}%`)
          )
        );
      }

      if (organizationId) {
        conditions.push(eq(datasets.organizationId, organizationId));
      }

      const whereClause =
        conditions.length > 0
          ? sql`${sql.join(conditions, sql` AND `)}`
          : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(datasets)
        .where(whereClause);

      const datasetsList = await db
        .select({
          id: datasets.id,
          name: datasets.name,
          handle: datasets.handle,
          organizationId: datasets.organizationId,
          organizationName: organizations.name,
          organizationHandle: organizations.handle,
          createdAt: datasets.createdAt,
          updatedAt: datasets.updatedAt,
        })
        .from(datasets)
        .innerJoin(organizations, eq(datasets.organizationId, organizations.id))
        .where(whereClause)
        .orderBy(desc(datasets.createdAt))
        .limit(limit)
        .offset(offset);

      return c.json({
        datasets: datasetsList,
        pagination: {
          page,
          limit,
          total: countResult?.count ?? 0,
          totalPages: Math.ceil((countResult?.count ?? 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin datasets:", error);
      return c.json({ error: "Failed to fetch datasets" }, 500);
    }
  }
);

export default adminDatasetsRoutes;
