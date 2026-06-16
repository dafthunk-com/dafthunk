/**
 * Generic node for third-party models served through Cloudflare's unified AI
 * Gateway REST API (the `author/model` catalog at
 * https://developers.cloudflare.com/ai/models/). Distinct from the
 * Workers-AI-only `cloudflare-model` node: those run `@cf/...` models via
 * `AI.run`; these proxy partner providers (xAI, OpenAI, …) through the gateway
 * with Unified Billing.
 */

/** Node-type identifier for the generic Cloudflare Gateway model node. */
export const CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE = "cloudflare-gateway-model";

/** Hidden input name carrying the `author/model` identifier. */
export const CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME = "model";

/**
 * Hidden marker input emitted by the schema mapper when a model requires an
 * `output.upload_url` (file-output models like video generation). Its presence
 * tells the runtime to presign an R2 upload URL and inject it as
 * `output.upload_url`, then read the produced file back from R2.
 */
export const CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME = "_upload_url";

/**
 * Metadata key used to round-trip per-model display data (description) through
 * the backend save path, mirroring the Replicate model node. The docs dialog
 * reads `node.metadata[CFG_META_KEY]` at render time.
 */
export const CFG_META_KEY = "_cfg_meta";

export interface CloudflareGatewayModelMeta {
  description?: string;
}

/** Public Cloudflare docs page URL for an `author/model` id. */
export function cloudflareGatewayModelUrl(modelId: string): string {
  return `https://developers.cloudflare.com/ai/models/${modelId}/`;
}

export function encodeCloudflareGatewayModelMeta(
  meta: CloudflareGatewayModelMeta
): string {
  const out: CloudflareGatewayModelMeta = {};
  if (meta.description) out.description = meta.description;
  return JSON.stringify(out);
}
