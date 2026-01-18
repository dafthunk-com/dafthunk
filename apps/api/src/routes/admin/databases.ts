import { zValidator } from "@hono/zod-validator";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import { createDatabase, databases, organizations } from "../../db";

const adminDatabasesRoutes = new Hono<ApiContext>();

/**
 * GET /admin/databases
 *
 * List all databases across all organizations with pagination and optional search
 */
adminDatabasesRoutes.get(
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
            like(databases.name, `%${search}%`),
            like(databases.handle, `%${search}%`)
          )
        );
      }

      if (organizationId) {
        conditions.push(eq(databases.organizationId, organizationId));
      }

      const whereClause =
        conditions.length > 0
          ? sql`${sql.join(conditions, sql` AND `)}`
          : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(databases)
        .where(whereClause);

      const databasesList = await db
        .select({
          id: databases.id,
          name: databases.name,
          handle: databases.handle,
          organizationId: databases.organizationId,
          organizationName: organizations.name,
          organizationHandle: organizations.handle,
          createdAt: databases.createdAt,
          updatedAt: databases.updatedAt,
        })
        .from(databases)
        .innerJoin(
          organizations,
          eq(databases.organizationId, organizations.id)
        )
        .where(whereClause)
        .orderBy(desc(databases.createdAt))
        .limit(limit)
        .offset(offset);

      return c.json({
        databases: databasesList,
        pagination: {
          page,
          limit,
          total: countResult?.count ?? 0,
          totalPages: Math.ceil((countResult?.count ?? 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin databases:", error);
      return c.json({ error: "Failed to fetch databases" }, 500);
    }
  }
);

export default adminDatabasesRoutes;
