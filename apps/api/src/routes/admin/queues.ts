import { zValidator } from "@hono/zod-validator";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import { createDatabase, organizations, queues } from "../../db";

const adminQueuesRoutes = new Hono<ApiContext>();

/**
 * GET /admin/queues
 *
 * List all queues across all organizations with pagination and optional search
 */
adminQueuesRoutes.get(
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
            like(queues.name, `%${search}%`),
            like(queues.handle, `%${search}%`)
          )
        );
      }

      if (organizationId) {
        conditions.push(eq(queues.organizationId, organizationId));
      }

      const whereClause =
        conditions.length > 0
          ? sql`${sql.join(conditions, sql` AND `)}`
          : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(queues)
        .where(whereClause);

      const queuesList = await db
        .select({
          id: queues.id,
          name: queues.name,
          handle: queues.handle,
          organizationId: queues.organizationId,
          organizationName: organizations.name,
          organizationHandle: organizations.handle,
          createdAt: queues.createdAt,
          updatedAt: queues.updatedAt,
        })
        .from(queues)
        .innerJoin(organizations, eq(queues.organizationId, organizations.id))
        .where(whereClause)
        .orderBy(desc(queues.createdAt))
        .limit(limit)
        .offset(offset);

      return c.json({
        queues: queuesList,
        pagination: {
          page,
          limit,
          total: countResult?.count ?? 0,
          totalPages: Math.ceil((countResult?.count ?? 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin queues:", error);
      return c.json({ error: "Failed to fetch queues" }, 500);
    }
  }
);

export default adminQueuesRoutes;
