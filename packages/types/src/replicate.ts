/** Node-type identifier for the generic Replicate model node. */
export const REPLICATE_MODEL_NODE_TYPE = "replicate-model";

/** Hidden input name carrying the Replicate model identifier. */
export const REPLICATE_MODEL_INPUT_NAME = "model";

/**
 * Metadata key used to round-trip per-model display data (description)
 * through the backend save path. The docs dialog reads
 * `node.metadata[RP_META_KEY]` at render time and synthesises
 * description / documentation / referenceUrl from it.
 */
export const RP_META_KEY = "_rp_meta";

export interface ReplicateModelMeta {
  description?: string;
}

/**
 * Strip an optional `:version` suffix to keep only the `owner/name` segment
 * used for display and URL construction.
 */
export function replicateOwnerName(modelId: string): string {
  const colon = modelId.indexOf(":");
  return colon === -1 ? modelId : modelId.slice(0, colon);
}

/** Public Replicate model page URL for an `owner/name` (or `owner/name:version`) id. */
export function replicateModelUrl(modelId: string): string {
  return `https://replicate.com/${replicateOwnerName(modelId)}`;
}

export function encodeReplicateModelMeta(meta: ReplicateModelMeta): string {
  const out: ReplicateModelMeta = {};
  if (meta.description) out.description = meta.description;
  return JSON.stringify(out);
}
