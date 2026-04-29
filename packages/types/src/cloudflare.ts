import type { CloudflareModelInfo } from "./types";

/** Node-type identifier for the generic Cloudflare Workers AI model node. */
export const CLOUDFLARE_MODEL_NODE_TYPE = "cloudflare-model";

/** Hidden input name carrying the Cloudflare Workers AI model identifier. */
export const CLOUDFLARE_MODEL_INPUT_NAME = "model";

/**
 * Metadata key used to round-trip per-model display data (description,
 * task) through the backend save path. The docs dialog reads
 * `node.metadata[CF_META_KEY]` at render time and synthesises
 * description / documentation / referenceUrl from it.
 */
export const CF_META_KEY = "_cf_meta";

/**
 * Metadata key marking a synthesized per-model node. When set to "true"
 * the editor renders no model picker for the node — switching the
 * underlying model would change the node's identity and clear wired
 * edges, so users are directed to drop a different node from the palette
 * instead. The fallback "Cloudflare Model (Custom)" entry omits this flag
 * and keeps the full picker.
 */
export const CF_LOCKED_KEY = "_cf_locked";

export interface CloudflareModelMeta {
  description?: string;
  taskName?: string;
}

/** Short display name for a Cloudflare model id: last path segment. */
export function shortName(id: string): string {
  const slash = id.lastIndexOf("/");
  return slash === -1 ? id : id.slice(slash + 1);
}

/** Public Cloudflare docs URL for a model — catalog page path == short name. */
export function cloudflareDocsUrl(modelId: string): string {
  return `https://developers.cloudflare.com/workers-ai/models/${shortName(modelId)}/`;
}

export function encodeCloudflareModelMeta(info: CloudflareModelInfo): string {
  const meta: CloudflareModelMeta = {};
  if (info.description) meta.description = info.description;
  if (info.task?.name) meta.taskName = info.task.name;
  return JSON.stringify(meta);
}
