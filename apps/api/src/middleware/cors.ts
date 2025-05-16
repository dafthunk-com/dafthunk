import { cors } from "hono/cors";
import type { Context } from "hono";
import { ApiContext } from "../context";

export const corsMiddleware = (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  return cors({
    origin: c.env.WEB_HOST,
    allowHeaders: [
      "X-Custom-Header",
      "Authorization",
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      ...(c.env.CLOUDFLARE_ENV !== "development"
        ? ["Upgrade-Insecure-Requests"]
        : []),
    ],
    allowMethods: ["POST", "GET", "PUT", "DELETE", "OPTIONS", "PATCH"],
    exposeHeaders: ["Content-Length", "X-Content-Type-Options"],
    maxAge: 600,
    credentials: true,
  })(c, next);
};
