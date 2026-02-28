import {
  mapReplicateSchema,
  type ReplicateOpenApiSchema,
} from "@dafthunk/runtime/utils/replicate-schema";
import type { ReplicateModelSchema } from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";

const replicateRoutes = new Hono<ApiContext>();

replicateRoutes.use("*", jwtMiddleware);

/**
 * GET /replicate/models/:owner/:name/schema
 *
 * Fetches a Replicate model's OpenAPI schema and maps it to Dafthunk Parameters.
 */
replicateRoutes.get("/models/:owner/:name/schema", async (c) => {
  const { owner, name } = c.req.param();
  const apiToken = c.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    return c.json({ error: "REPLICATE_API_TOKEN is not configured" }, 500);
  }

  const response = await fetch(
    `https://api.replicate.com/v1/models/${owner}/${name}`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const status = response.status === 404 ? 404 : 502;
    return c.json(
      {
        error: `Replicate API error: ${response.status} ${response.statusText}`,
      },
      status
    );
  }

  const model = (await response.json()) as {
    description?: string;
    latest_version?: {
      id?: string;
      openapi_schema?: ReplicateOpenApiSchema;
    };
  };

  const openApiSchema = model.latest_version?.openapi_schema;
  if (!openApiSchema) {
    return c.json(
      { error: "Model has no published version with an OpenAPI schema" },
      404
    );
  }

  const { inputs, outputs } = mapReplicateSchema(
    openApiSchema,
    model.description
  );
  const version = model.latest_version?.id ?? "";

  return c.json({
    model: `${owner}/${name}`,
    version,
    inputs,
    outputs,
  } satisfies ReplicateModelSchema);
});

export default replicateRoutes;
