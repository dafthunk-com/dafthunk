import type { CloudflareModelInfo } from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import {
  CloudflareApiError,
  fetchCloudflareModelCatalog,
  fetchCloudflareModelSchemaPayload,
} from "../runtime/cloudflare-model-catalog";

const cloudflareAiRoutes = new Hono<ApiContext>();

cloudflareAiRoutes.use("*", jwtMiddleware);

/**
 * Consistent error response mapping Cloudflare failures to HTTP statuses.
 */
function handleCloudflareError(
  c: {
    json: (body: object, status: 400 | 404 | 500 | 502) => Response;
  },
  err: unknown
) {
  if (err instanceof CloudflareApiError) {
    if (err.status === 400) return c.json({ error: err.message }, 400);
    if (err.status === 404) return c.json({ error: err.message }, 404);
    if (err.status === 500) return c.json({ error: err.message }, 500);
    return c.json({ error: err.message }, 502);
  }
  return c.json(
    { error: err instanceof Error ? err.message : "Unknown error" },
    502
  );
}

/**
 * GET /cloudflare-ai/models/schema?model=@cf/...
 *
 * Fetches a Cloudflare Workers AI model's JSON schema, mapped to Dafthunk
 * Parameters and cached in the Workers runtime cache.
 */
cloudflareAiRoutes.get("/models/schema", async (c) => {
  const modelParam = c.req.query("model");
  if (!modelParam) {
    return c.json({ error: "model query parameter is required" }, 400);
  }

  try {
    const payload = await fetchCloudflareModelSchemaPayload(
      c.env,
      c.executionCtx,
      modelParam
    );
    return c.json(payload);
  } catch (err) {
    return handleCloudflareError(c, err);
  }
});

/**
 * GET /cloudflare-ai/models
 *
 * Returns the trimmed Cloudflare Workers AI catalog. The full catalog is
 * fetched once per TTL window and filtered client-side by the widget; the
 * response carries only the fields the frontend actually renders.
 */
cloudflareAiRoutes.get("/models", async (c) => {
  try {
    const models: CloudflareModelInfo[] = await fetchCloudflareModelCatalog(
      c.env,
      c.executionCtx
    );
    return c.json({ models });
  } catch (err) {
    return handleCloudflareError(c, err);
  }
});

export default cloudflareAiRoutes;
