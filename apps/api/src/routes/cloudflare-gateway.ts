import { mapCloudflareGatewaySchema } from "@dafthunk/runtime/utils/cloudflare-gateway-schema";
import type { CloudflareGatewayModelSchema } from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";

const cloudflareGatewayRoutes = new Hono<ApiContext>();

cloudflareGatewayRoutes.use("*", jwtMiddleware);

/**
 * GET /cloudflare-gateway/models/:author/:model/schema
 *
 * Cloudflare's unified (`author/model`) catalog has no programmatic search/
 * schema API — the per-model JSON Schemas are published as static documents on
 * the docs site. We fetch both and map them to Dafthunk Parameters so the
 * editor can build the node's inputs and outputs.
 */
cloudflareGatewayRoutes.get("/models/:author/:model/schema", async (c) => {
  const { author, model } = c.req.param();
  const modelId = `${author}/${model}`;
  const base = `https://developers.cloudflare.com/ai/models/${modelId}`;

  const [inputRes, outputRes] = await Promise.all([
    fetch(`${base}/schema-input.json`),
    fetch(`${base}/schema-output.json`),
  ]);

  if (inputRes.status === 404) {
    return c.json({ error: `Unknown model "${modelId}"` }, 404);
  }
  if (!inputRes.ok) {
    return c.json({ error: `Cloudflare docs error: ${inputRes.status}` }, 502);
  }

  const inputSchema = (await inputRes.json()) as Parameters<
    typeof mapCloudflareGatewaySchema
  >[0];
  const outputSchema = outputRes.ok
    ? ((await outputRes.json()) as Parameters<
        typeof mapCloudflareGatewaySchema
      >[1])
    : undefined;

  const { inputs, outputs, requiresUploadUrl } = mapCloudflareGatewaySchema(
    inputSchema,
    outputSchema
  );

  return c.json({
    model: modelId,
    requiresUploadUrl,
    inputs,
    outputs,
  } satisfies CloudflareGatewayModelSchema);
});

export default cloudflareGatewayRoutes;
