import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import {
  fetchGatewayModelSchema,
  GatewayModelNotFound,
} from "../runtime/cloudflare-gateway-catalog";

const cloudflareGatewayRoutes = new Hono<ApiContext>();

cloudflareGatewayRoutes.use("*", jwtMiddleware);

/**
 * GET /cloudflare-gateway/models/:author/:model/schema
 *
 * Cloudflare's unified (`author/model`) catalog has no programmatic search/
 * schema API — the per-model JSON Schemas are published as static documents on
 * the docs site. Fetching and mapping them lives in the catalog module, which
 * also builds the palette's per-model nodes, so a pasted identifier and a
 * palette entry cannot disagree about a model's ports.
 */
cloudflareGatewayRoutes.get("/models/:author/:model/schema", async (c) => {
  const { author, model } = c.req.param();
  const modelId = `${author}/${model}`;

  try {
    const schema = await fetchGatewayModelSchema(modelId, c.executionCtx);
    return c.json(schema);
  } catch (error) {
    if (error instanceof GatewayModelNotFound) {
      return c.json({ error: error.message }, 404);
    }
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load model schema",
      },
      502
    );
  }
});

export default cloudflareGatewayRoutes;
