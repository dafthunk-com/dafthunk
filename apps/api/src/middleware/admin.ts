import { Context } from "hono";

import { ApiContext } from "../context";
import { UserRole } from "../db/schema";

/**
 * Middleware that enforces admin role access.
 * Must be used after jwtMiddleware to ensure jwtPayload is available.
 *
 * Returns 401 if not authenticated, 403 if not an admin.
 */
export const adminMiddleware = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const jwtPayload = c.get("jwtPayload");

  if (!jwtPayload) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (jwtPayload.role !== UserRole.ADMIN) {
    console.warn("Admin access denied", {
      userId: jwtPayload.sub,
      path: c.req.path,
      method: c.req.method,
    });
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  await next();
};
