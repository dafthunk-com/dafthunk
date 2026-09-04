import { CloudflareGatewayModelNode } from "@dafthunk/runtime/nodes/cloudflare/cloudflare-gateway-model-node";
import type { CloudflareGatewayMappedSchema } from "@dafthunk/runtime/utils/cloudflare-gateway-schema";
import { mapCloudflareGatewaySchema } from "@dafthunk/runtime/utils/cloudflare-gateway-schema";
import {
  CF_LOCKED_KEY,
  CFG_META_KEY,
  CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME,
  CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE,
  CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME,
  type CloudflareGatewayModelSchema,
  cloudflareGatewayModelUrl,
  encodeCloudflareGatewayModelMeta,
  type NodeType,
  type Parameter,
  shortName,
} from "@dafthunk/types";

import type { DeferredWorkContext } from "../context";
import { CACHE_HOST, cachedJson } from "../utils/edge-cache";
import type { GatewayModelEntry } from "./gateway-models";
import { GATEWAY_MODELS } from "./gateway-models";

/**
 * Per-model NodeTypes for Cloudflare's unified (`author/model`) catalog — the
 * partner models served through the AI Gateway, which is where video
 * generation lives.
 *
 * The sibling of `cloudflare-model-catalog.ts`, and it exists because that
 * module cannot reach these. Workers AI publishes a search API listing the
 * models it hosts, and that module uses it. The unified catalog publishes no
 * such API: measured against this account, the search endpoint serves 65
 * models with no video among them, on every page and under every `source`
 * filter, while reporting a total of 303 that includes models it will not
 * list.
 *
 * Which models are offered is therefore stated in `gateway-models.ts` rather
 * than discovered. What each one looks like is not: ports come from the
 * schema documents Cloudflare publishes per model, the same ones the editor
 * fetches when someone pastes an identifier, so this module never describes a
 * model's shape and cannot fall out of step with the one the runtime calls.
 *
 * What comes out is the same shape the Workers AI module produces: one
 * NodeType per model, sharing the one gateway implementation, distinguished by
 * `id`, with ports resolved from the published schema so the node is usable
 * the moment it lands on the canvas.
 */

/**
 * Cache TTL (seconds). An upper bound — the Workers cache may evict earlier.
 *
 * One value for both layers on purpose. The bundle is a pure function of
 * `GATEWAY_MODELS`, which only changes on deploy, and of these schemas; a
 * shorter bundle TTL would rebuild a byte-identical answer on the hour, at
 * every POP, on somebody's palette request.
 */
const SCHEMA_TTL = 24 * 60 * 60;

/** The published schema documents, as the mapper wants to receive them. */
type SchemaDocument = Parameters<typeof mapCloudflareGatewaySchema>[0];

/** Raised when the docs site has no such model, so a miss is never cached. */
export class GatewayModelNotFound extends Error {
  constructor(modelId: string) {
    super(`Unknown model "${modelId}"`);
  }
}

/**
 * One published schema document, or nothing when the docs site has none.
 *
 * What a missing document means is a question about the pair, not about
 * either half, so it is answered by the caller: an absent output schema is
 * ordinary and an absent input schema means there is no such model.
 */
async function fetchSchemaDocument(
  modelId: string,
  kind: "schema-input" | "schema-output"
): Promise<SchemaDocument> {
  const url = `${cloudflareGatewayModelUrl(modelId)}${kind}.json`;
  const response = await fetch(url);

  if (!response.ok) {
    // Nothing here reads a failed body, and an abandoned one holds its
    // connection open.
    await response.body?.cancel();
    if (response.status === 404) return undefined;
    throw new Error(
      `Cloudflare docs error for ${modelId} (${kind}): ${response.status}`
    );
  }

  return (await response.json()) as SchemaDocument;
}

/**
 * A model's ports, mapped from the schema documents Cloudflare publishes.
 *
 * Shared with the route the editor's model input calls, so the palette entry
 * and a hand-pasted identifier resolve through the same code and cannot
 * disagree about a model's shape.
 */
export async function fetchGatewayModelSchema(
  modelId: string,
  ctx: DeferredWorkContext
): Promise<CloudflareGatewayModelSchema> {
  return cachedJson(
    `${CACHE_HOST}/cf-gateway/schema/v1/${modelId}`,
    SCHEMA_TTL,
    ctx,
    async () => {
      const [inputSchema, outputSchema] = await Promise.all([
        fetchSchemaDocument(modelId, "schema-input"),
        fetchSchemaDocument(modelId, "schema-output"),
      ]);

      // No input document is how the docs say a model does not exist.
      if (!inputSchema) throw new GatewayModelNotFound(modelId);

      return {
        model: modelId,
        ...mapCloudflareGatewaySchema(inputSchema, outputSchema),
      };
    }
  );
}

/**
 * Facts that belong to the implementation rather than to any one model, read
 * off the node itself so a change there cannot leave these behind.
 */
const { usage, inlinable, asTool } = CloudflareGatewayModelNode.nodeType;

/**
 * Keyed on the task union rather than switched over every label Cloudflare
 * publishes, so adding a task to `GatewayModelEntry` fails to compile here
 * instead of quietly landing on a fallback icon.
 */
const ICON_BY_TASK: Record<GatewayModelEntry["task"], string> = {
  "Text-to-Video": "video",
  "Image-to-Video": "video",
};

/** `alibaba/hh1-t2v` reads as "Alibaba Hh1 T2v" — the author, then the model. */
function displayName(entry: GatewayModelEntry): string {
  const words = shortName(entry.id)
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
  return `${entry.author} ${words}`.trim();
}

/**
 * One catalog entry as a palette node.
 *
 * The runtime dispatch key is always the generic gateway type; uniqueness
 * comes from `id`, exactly as the Workers AI module does it. Two inputs are
 * ours rather than the model's: the identifier, pre-filled and hidden, which
 * is what the executable reads; and the upload marker, present only for
 * file-output models, whose presence is what tells the runtime to presign an
 * R2 destination and read the produced file back.
 */
export function buildGatewayModelNodeType(
  entry: GatewayModelEntry,
  schema: CloudflareGatewayMappedSchema
): NodeType {
  const inputs: Parameter[] = [
    {
      name: CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME,
      type: "string",
      description:
        "Cloudflare unified model identifier in the format author/model",
      required: true,
      hidden: true,
      value: entry.id,
    },
    ...schema.inputs,
    ...(schema.requiresUploadUrl
      ? [
          {
            name: CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME,
            type: "string" as const,
            description: "Internal: presigned output upload destination",
            hidden: true,
            value: "",
          },
        ]
      : []),
  ];

  return {
    id: `cfg-model:${entry.id}`,
    name: displayName(entry),
    type: CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE,
    description: entry.description,
    tags: ["AI", "Cloudflare", entry.task],
    icon: ICON_BY_TASK[entry.task],
    referenceUrl: cloudflareGatewayModelUrl(entry.id),
    usage,
    inlinable,
    asTool,
    inputs,
    outputs: schema.outputs,
    metadata: {
      [CFG_META_KEY]: encodeCloudflareGatewayModelMeta({
        description: entry.description,
      }),
      // Pinned: the model is the identity of this palette entry, so swapping
      // it would leave a node whose name and ports describe a different one.
      [CF_LOCKED_KEY]: "true",
    },
  };
}

/**
 * Every listed partner model as a NodeType.
 *
 * Needs no account credentials: the schemas are public documents. Running one of these does need Unified Billing credits, which is
 * a property of the account rather than of the deployment, so it cannot be
 * decided here — an unfunded account gets a node that fails at execution with
 * the provider's own message.
 */
export async function getCloudflareGatewayModelNodeTypes(
  ctx: DeferredWorkContext
): Promise<NodeType[]> {
  return cachedJson(
    `${CACHE_HOST}/cf-gateway/node-types/v1`,
    SCHEMA_TTL,
    ctx,
    async () => {
      const settled = await Promise.allSettled(
        GATEWAY_MODELS.map(async (entry) => {
          const schema = await fetchGatewayModelSchema(entry.id, ctx);
          // A model whose schema maps to nothing would arrive as a node with
          // one hidden identifier and no way to say what to generate —
          // unwireable, and indistinguishable in the palette from one that
          // works. The listed models are known to map, so this catches a
          // schema that changed under us rather than a known bad entry.
          if (schema.inputs.length === 0) {
            throw new Error(
              `${entry.id}: schema mapped to no inputs, so the node would have nothing to drive it`
            );
          }
          return buildGatewayModelNodeType(entry, schema);
        })
      );

      const nodeTypes: NodeType[] = [];
      for (const result of settled) {
        if (result.status === "fulfilled") {
          nodeTypes.push(result.value);
          continue;
        }
        console.warn(
          "[cloudflare-gateway] Failed to synthesise NodeType:",
          result.reason
        );
      }
      console.log(
        `[cloudflare-gateway] Synthesised ${nodeTypes.length} of ${GATEWAY_MODELS.length} listed models`
      );

      return nodeTypes;
    },
    // Every model is listed in source, so an empty bundle means every schema
    // fetch failed at once. Caching that would turn a blip into a day of a
    // palette with no video in it.
    (nodeTypes) => nodeTypes.length > 0
  );
}
