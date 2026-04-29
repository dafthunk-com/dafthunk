import {
  type CloudflareModelOpenApiSchema,
  mapCloudflareSchema,
} from "@dafthunk/runtime/utils/cloudflare-schema";
import {
  CF_LOCKED_KEY,
  CF_META_KEY,
  CLOUDFLARE_MODEL_INPUT_NAME,
  CLOUDFLARE_MODEL_NODE_TYPE,
  type CloudflareModelInfo,
  type CloudflareModelSchema,
  cloudflareDocsUrl,
  encodeCloudflareModelMeta,
  type NodeType,
  type Parameter,
  shortName,
} from "@dafthunk/types";

import type { Bindings } from "../context";
import { cachedJson } from "../utils/edge-cache";

/**
 * Shared catalog logic for Cloudflare Workers AI models. Used by both:
 *  - `routes/cloudflare-ai.ts` to back the `/cloudflare-ai/models` and
 *    `/cloudflare-ai/models/schema` endpoints (consumed by the in-node model
 *    picker dialog), and
 *  - `routes/types.ts` to surface every model as a first-class entry in the
 *    workflow editor's node palette without registering one runtime
 *    implementation per model.
 *
 * Reuses `cachedJson` so list, schema and the assembled NodeType bundle are
 * all backed by the per-POP Workers cache and shared across both routes.
 */

/** Cache TTLs (seconds). Upper bounds — the Workers cache may evict earlier. */
export const MODELS_LIST_TTL = 60 * 60; // 1h — catalog additions are rare
export const MODEL_SCHEMA_TTL = 24 * 60 * 60; // 24h — schemas almost never change
const NODE_TYPES_BUNDLE_TTL = 60 * 60; // 1h — derived purely from the above

/**
 * Per-page size requested from the Cloudflare models/search endpoint. If the
 * response hits this count, the catalog may be larger than we fetched — we
 * log a warning so operators know to either raise this value or paginate.
 */
const MODELS_LIST_PAGE_SIZE = 200;

/** Synthetic host used as the Cache API key namespace. */
const CACHE_HOST = "https://cache.dafthunk.internal";

/**
 * Error thrown when the upstream Cloudflare API returns a non-success status.
 * Kept as a typed error so we don't cache failed responses and can map back
 * to the right HTTP status.
 */
export class CloudflareApiError extends Error {
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
export function normaliseModelId(raw: string): string {
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

function requireCredentials(env: Bindings): {
  accountId: string;
  apiToken: string;
} {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new CloudflareApiError(
      "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be configured",
      500
    );
  }
  return { accountId, apiToken };
}

/**
 * Cached catalog list. Filters out experimental entries upstream so we don't
 * surface partial/broken models in the editor.
 */
export async function fetchCloudflareModelCatalog(
  env: Bindings,
  ctx: ExecutionContext
): Promise<CloudflareModelInfo[]> {
  const { accountId, apiToken } = requireCredentials(env);
  const cacheKey = `${CACHE_HOST}/cf-ai/models/list`;

  const payload = await cachedJson<{ models: CloudflareModelInfo[] }>(
    cacheKey,
    MODELS_LIST_TTL,
    ctx,
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
  return payload.models;
}

/**
 * Cached schema lookup that distinguishes "model has no published schema"
 * (Cloudflare 404) from genuine errors. Returns `null` for known-missing
 * schemas so callers can skip them; the null result is itself cached so
 * subsequent calls don't re-poll the upstream API every TTL window.
 *
 * Some entries in Cloudflare's catalog (mostly partner / image classification
 * models) don't expose a JSON schema and consistently 404 here.
 */
async function fetchCloudflareModelSchemaOrNull(
  env: Bindings,
  ctx: ExecutionContext,
  modelIdRaw: string
): Promise<CloudflareModelSchema | null> {
  const model = normaliseModelId(modelIdRaw);
  if (!model) {
    throw new CloudflareApiError("model query parameter is required", 400);
  }
  const { accountId, apiToken } = requireCredentials(env);
  const cacheKey = `${CACHE_HOST}/cf-ai/models/schema/v3/${encodeURIComponent(model)}`;

  return await cachedJson<CloudflareModelSchema | null>(
    cacheKey,
    MODEL_SCHEMA_TTL,
    ctx,
    async () => {
      const url = new URL(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/schema`
      );
      url.searchParams.set("model", model);
      try {
        const raw = await callCloudflare<CloudflareModelOpenApiSchema>(
          url.toString(),
          apiToken
        );
        const { inputs, outputs } = mapCloudflareSchema(raw);
        return { model, inputs, outputs };
      } catch (err) {
        if (err instanceof CloudflareApiError && err.status === 404) {
          console.log(`[cloudflare-ai] No schema for ${model} (upstream 404)`);
          return null;
        }
        throw err;
      }
    }
  );
}

/**
 * Cached mapped schema for a single model. Throws `CloudflareApiError(404)`
 * if the model has no published schema (so the public route returns the
 * right HTTP status).
 */
export async function fetchCloudflareModelSchemaPayload(
  env: Bindings,
  ctx: ExecutionContext,
  modelIdRaw: string
): Promise<CloudflareModelSchema> {
  const schema = await fetchCloudflareModelSchemaOrNull(env, ctx, modelIdRaw);
  if (!schema) {
    throw new CloudflareApiError(
      `No published schema for model ${normaliseModelId(modelIdRaw)}`,
      404
    );
  }
  return schema;
}

/**
 * Compose the full list of synthetic NodeTypes derived from the Cloudflare
 * catalog. Cached as a single bundle (1h) so /types stays cheap even when
 * the catalog has 100+ entries — every contributing fetch is itself cached
 * for longer (catalog: 1h, schemas: 24h).
 */
export async function getCloudflareModelNodeTypes(
  env: Bindings,
  ctx: ExecutionContext
): Promise<NodeType[]> {
  const cacheKey = `${CACHE_HOST}/cf-ai/node-types/v9`;

  // Inline the cache lookup so we can refuse to persist an empty bundle —
  // emptiness is almost always a transient signal (catalog fetch failed,
  // every schema 404'd) and we'd rather retry than serve a stale empty
  // list for the full TTL.
  const request = new Request(cacheKey);
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return (await hit.json()) as NodeType[];

  const models = await fetchCloudflareModelCatalog(env, ctx);
  const settled = await Promise.allSettled(
    models.map(async (model) => {
      // `model.name` carries the canonical `@cf/<provider>/<slug>` identifier
      // that the schema/run endpoints expect; `model.id` is a UUID and not
      // accepted by upstream.
      const schema = await fetchCloudflareModelSchemaOrNull(
        env,
        ctx,
        model.name
      );
      // Models without a published schema (Cloudflare returns 404) are
      // expected and silently skipped — they can't be wired up without
      // input/output definitions.
      if (!schema) return null;
      return buildModelNodeType(model, schema);
    })
  );

  const nodeTypes: NodeType[] = [];
  let skippedNoSchema = 0;
  let failed = 0;
  for (const result of settled) {
    if (result.status === "fulfilled") {
      if (result.value) nodeTypes.push(result.value);
      else skippedNoSchema++;
    } else {
      failed++;
      // Genuine errors (auth, 5xx, mapping bugs) — don't poison the
      // bundle, but surface them so operators notice.
      console.warn(
        "[cloudflare-ai] Failed to synthesise NodeType for model:",
        result.reason
      );
    }
  }
  console.log(
    `[cloudflare-ai] Synthesised ${nodeTypes.length} NodeTypes (skipped ${skippedNoSchema} without schema, ${failed} errored)`
  );

  // Only cache when we have a non-empty bundle. Caching `[]` would freeze
  // the editor's catalog into "no Cloudflare models" for an hour.
  if (nodeTypes.length > 0) {
    const response = new Response(JSON.stringify(nodeTypes), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${NODE_TYPES_BUNDLE_TTL}`,
      },
    });
    ctx.waitUntil(cache.put(request, response.clone()));
  }
  return nodeTypes;
}

// ------------------------------ Adapter ------------------------------

/**
 * Map a Cloudflare task name onto a node icon. Falls back to `bot` for
 * uncategorised or unknown tasks. Keep entries grouped by Cloudflare's
 * task taxonomy — see https://developers.cloudflare.com/workers-ai/models/.
 */
function iconForTask(taskName: string | undefined): string {
  if (!taskName) return "bot";
  switch (taskName) {
    case "Text Generation":
    case "Text Embeddings":
    case "Text Classification":
      return "sparkles";
    case "Automatic Speech Recognition":
    case "Speech Recognition":
    case "Text-to-Speech":
      return "mic";
    case "Text-to-Image":
    case "Image-to-Image":
    case "Image-to-Text":
    case "Image Classification":
    case "Object Detection":
      return "image";
    case "Translation":
      return "languages";
    case "Summarization":
      return "file-text";
    default:
      return "bot";
  }
}

/**
 * Pretty-up a model's display name. `info.name` is the canonical
 * `@cf/<provider>/<slug>` identifier; we extract the trailing slug and
 * title-case it ("@cf/openai/whisper" → "Whisper"). Dots are preserved
 * since they're often part of version numbers (e.g. `llama-3.3-70b...`
 * → "Llama 3.3 70b ...").
 */
function displayName(info: CloudflareModelInfo): string {
  const slug = shortName(info.name);
  return slug
    .split(/[-_\s]+/)
    .filter((s) => s.length > 0)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

/**
 * Build a NodeType for a single catalog entry. The runtime dispatch key is
 * always `cloudflare-model`; uniqueness comes from the `id` field (which the
 * editor uses to key the palette). Editor-internal flags ride on
 * `metadata` (so they round-trip through save/load without showing up as
 * inputs); the only hidden input we keep is `model`, which the runtime
 * executable reads to invoke `AI.run`.
 */
export function buildModelNodeType(
  model: CloudflareModelInfo,
  schema: CloudflareModelSchema
): NodeType {
  // Cloudflare's catalog uses `name` for the canonical `@cf/<provider>/<slug>`
  // identifier and `id` for an opaque UUID. The runtime's `AI.run` and the
  // schema endpoint both want the canonical id, so that's what we bake in.
  const modelId = model.name;
  const taskName = model.task?.name;
  const tags = ["AI", "Cloudflare"];
  if (taskName) tags.push(taskName);

  // Drop any accidental `model` collisions from the schema mapper, then
  // prepend our own hidden input with the value pre-filled.
  const mappedInputs: Parameter[] = schema.inputs.filter(
    (p) => p.name !== CLOUDFLARE_MODEL_INPUT_NAME
  );

  // Models that publish a `response_format` input accept OpenAI-style
  // structured output. Surface a Dafthunk `schema` input alongside it: the
  // runtime translates a picked Schema → `response_format: { type:
  // "json_schema", json_schema: ... }` so users get the friendly schema
  // picker without losing the raw json escape hatch.
  const supportsResponseFormat = mappedInputs.some(
    (p) => p.name === "response_format"
  );
  const schemaInput: Parameter | null = supportsResponseFormat
    ? {
        name: "schema",
        type: "schema",
        description:
          "Constrain the model's output to a Dafthunk schema (sets response_format).",
        hidden: true,
      }
    : null;

  const inputs: Parameter[] = [
    {
      name: CLOUDFLARE_MODEL_INPUT_NAME,
      type: "string",
      description: "Cloudflare Workers AI model identifier",
      required: true,
      hidden: true,
      value: modelId,
    },
    ...(schemaInput ? [schemaInput] : []),
    ...mappedInputs,
  ];

  const hasTools = mappedInputs.some((p) => p.name === "tools");

  return {
    id: `cf-model:${modelId}`,
    name: displayName(model),
    type: CLOUDFLARE_MODEL_NODE_TYPE,
    description:
      model.description ??
      (taskName ? `${taskName}: ${modelId}` : `Cloudflare model ${modelId}`),
    tags,
    icon: iconForTask(taskName),
    referenceUrl: cloudflareDocsUrl(modelId),
    usage: 1,
    inputs,
    outputs: schema.outputs.map((o) => ({ ...o })),
    metadata: {
      [CF_META_KEY]: encodeCloudflareModelMeta(model),
      [CF_LOCKED_KEY]: "true",
    },
    ...(hasTools ? { functionCalling: true } : {}),
  } as NodeType;
}
