import { cors } from "hono/cors";
import type { Context } from "hono";
import { AppContext } from "../types/bindings";

export const corsMiddleware = (c: Context<AppContext>, next: () => Promise<void>) =>
  cors({
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
    allowMethods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Content-Type-Options"],
    maxAge: 600,
    credentials: true,
  })(c, next); 