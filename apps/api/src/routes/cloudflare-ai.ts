import {
  type CloudflareModelOpenApiSchema,
  mapCloudflareSchema,
} from "@dafthunk/runtime/utils/cloudflare-schema";
import type {
  CloudflareModelInfo,
  CloudflareModelSchema,
} from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { cachedJson } from "../utils/edge-cache";

const cloudflareAiRoutes = new Hono<ApiContext>();

cloudflareAiRoutes.use("*", jwtMiddleware);

/** Cache TTLs (seconds). Upper bounds — the Workers cache may evict earlier. */
const MODELS_LIST_TTL = 60 * 60; // 1h — catalog additions are rare
const MODEL_SCHEMA_TTL = 24 * 60 * 60; // 24h — model schemas almost never change

/**
 * Per-page size requested from the Cloudflare models/search endpoint. If the
 * response hits this count, the catalog may be larger than we fetched — we
 * log a warning so operators know to either raise this value or paginate.
 */
const MODELS_LIST_PAGE_SIZE = 200;

/** Synthetic host used as the Cache API key namespace for this route. */
const CACHE_HOST = "https://cache.dafthunk.internal";

/**
 * Error thrown when the upstream Cloudflare API returns a non-success status.
 * Kept as a typed error so we don't cache failed responses and can map back
 * to the right HTTP status.
 */
class CloudflareApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

/**
 * Normalise a Cloudflare model identifier. Accepts the canonical form
 * `@cf/provider/name` as well as values with the leading `@` url-encoded
 * (e.g. `%40cf/provider/name`).
 */
function normaliseModelId(raw: string): string {
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) return "";
  return decoded.startsWith("@") ? decoded : `@${decoded}`;
}

/**
 * Fetch a Cloudflare API endpoint and throw on failure. Throwing is important
 * so `cachedJson` doesn't persist error responses.
 */
async function callCloudflare<T>(url: string, apiToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new CloudflareApiError(
      `Cloudflare API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const json = (await response.json()) as {
    success: boolean;
    errors?: Array<{ message?: string }>;
    result?: T;
  };

  if (!json.success || !json.result) {
    const message = json.errors?.[0]?.message ?? "Unknown error";
    throw new CloudflareApiError(`Cloudflare API error: ${message}`, 502);
  }

  return json.result;
}

/**
 * Keep only the fields the UI actually consumes. Dropping CF's `properties`,
 * `tags`, `source`, and other passthrough fields shrinks the payload and
 * avoids leaking anything we don't deliberately expose.
 */
function trimModelInfo(raw: unknown): CloudflareModelInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;

  const task =
    r.task && typeof r.task === "object"
      ? (r.task as Record<string, unknown>)
      : null;

  return {
    id: r.id,
    name: r.name,
    ...(typeof r.description === "string"
      ? { description: r.description }
      : {}),
    ...(task && typeof task.id === "string" && typeof task.name === "string"
      ? { task: { id: task.id, name: task.name } }
      : {}),
  };
}

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
    const status: 404 | 502 = err.status === 404 ? 404 : 502;
    return c.json({ error: err.message }, status);
  }
  return c.json(
    { error: err instanceof Error ? err.message : "Unknown error" },
    502
  );
}

/**
 * GET /cloudflare-ai/models/schema?model=@cf/...
 *
 * Fetches a Cloudflare Workers AI model's JSON schema, maps it to Dafthunk
 * Parameters, and caches the mapped result in the Workers runtime cache.
 */
cloudflareAiRoutes.get("/models/schema", async (c) => {
  const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = c.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return c.json(
      {
        error:
          "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be configured",
      },
      500
    );
  }

  const modelParam = c.req.query("model");
  if (!modelParam) {
    return c.json({ error: "model query parameter is required" }, 400);
  }

  const model = normaliseModelId(modelParam);
  const cacheKey = `${CACHE_HOST}/cf-ai/models/schema/${encodeURIComponent(model)}`;

  try {
    const payload = await cachedJson<CloudflareModelSchema>(
      cacheKey,
      MODEL_SCHEMA_TTL,
      c.executionCtx,
      async () => {
        const url = new URL(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/schema`
        );
        url.searchParams.set("model", model);
        const raw = await callCloudflare<CloudflareModelOpenApiSchema>(
          url.toString(),
          apiToken
        );
        const { inputs, outputs } = mapCloudflareSchema(raw);
        return { model, inputs, outputs };
      }
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
  const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = c.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return c.json(
      {
        error:
          "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be configured",
      },
      500
    );
  }

  const cacheKey = `${CACHE_HOST}/cf-ai/models/list`;

  try {
    const payload = await cachedJson<{ models: CloudflareModelInfo[] }>(
      cacheKey,
      MODELS_LIST_TTL,
      c.executionCtx,
      async () => {
        const url = new URL(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`
        );
        url.searchParams.set("per_page", String(MODELS_LIST_PAGE_SIZE));
        url.searchParams.set("hide_experimental", "true");
        const raw = await callCloudflare<unknown[]>(url.toString(), apiToken);
        if (raw.length >= MODELS_LIST_PAGE_SIZE) {
          console.warn(
            `[cloudflare-ai] Catalog returned ${raw.length} entries (page size ${MODELS_LIST_PAGE_SIZE}); the list may be truncated — consider adding pagination.`
          );
        }
        const models = raw
          .map(trimModelInfo)
          .filter((m): m is CloudflareModelInfo => m !== null);
        return { models };
      }
    );
    return c.json(payload);
  } catch (err) {
    return handleCloudflareError(c, err);
  }
});

export default cloudflareAiRoutes;
