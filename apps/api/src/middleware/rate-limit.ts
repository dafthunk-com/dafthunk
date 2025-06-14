import { cloudflareRateLimiter } from "@hono-rate-limiter/cloudflare";
import { getCookie } from "hono/cookie";

import { JWT_ACCESS_TOKEN_NAME, verifyTokenForRateLimit } from "../auth";
import { ApiContext } from "../context";

export const createRateLimitMiddleware = (rateLimitBinding: RateLimit) => {
  return cloudflareRateLimiter<ApiContext>({
    rateLimitBinding,
    keyGenerator: async (c) => {
      // Try to get JWT token from cookie and parse it directly
      const accessToken = getCookie(c, JWT_ACCESS_TOKEN_NAME);
      if (accessToken) {
        const jwtPayload = await verifyTokenForRateLimit(
          accessToken,
          c.env.JWT_SECRET
        );
        if (jwtPayload?.organization?.id) {
          return `org:${jwtPayload.organization.id}`;
        }
      }

      // Try to get API key from header bearer token
      const authHeader = c.req.header("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const apiKey = authHeader.substring(7);
        return `api:${apiKey}`;
      }

      // Fall back to IP address
      return c.req.header("cf-connecting-ip") ?? "";
    },
    handler: (_, next) => next(),
  });
};
