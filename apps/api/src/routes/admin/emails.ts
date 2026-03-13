import { zValidator } from "@hono/zod-validator";
import { desc, eq, like, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import { createDatabase, emails, organizations } from "../../db";

const adminEmailsRoutes = new Hono<ApiContext>();

/**
 * GET /admin/emails
 *
 * List all emails across all organizations with pagination and optional search
 */
adminEmailsRoutes.get(
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
        conditions.push(like(emails.name, `%${search}%`));
      }

      if (organizationId) {
        conditions.push(eq(emails.organizationId, organizationId));
      }

      const whereClause =
        conditions.length > 0
          ? sql`${sql.join(conditions, sql` AND `)}`
          : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(emails)
        .where(whereClause);

      const emailsList = await db
        .select({
          id: emails.id,
          name: emails.name,
          organizationId: emails.organizationId,
          organizationName: organizations.name,
          createdAt: emails.createdAt,
          updatedAt: emails.updatedAt,
        })
        .from(emails)
        .innerJoin(organizations, eq(emails.organizationId, organizations.id))
        .where(whereClause)
        .orderBy(desc(emails.createdAt))
        .limit(limit)
        .offset(offset);

      return c.json({
        emails: emailsList,
        pagination: {
          page,
          limit,
          total: countResult?.count ?? 0,
          totalPages: Math.ceil((countResult?.count ?? 0) / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin emails:", error);
      return c.json({ error: "Failed to fetch emails" }, 500);
    }
  }
);

export default adminEmailsRoutes;
