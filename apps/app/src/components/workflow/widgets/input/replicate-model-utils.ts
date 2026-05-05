import {
  type ReplicateModelMeta,
  replicateModelUrl,
  replicateOwnerName,
} from "@dafthunk/types";

export type { ReplicateModelMeta } from "@dafthunk/types";
export {
  encodeReplicateModelMeta,
  REPLICATE_MODEL_NODE_TYPE,
  RP_META_KEY,
  replicateModelUrl,
  replicateOwnerName,
} from "@dafthunk/types";

/**
 * Best-effort parse of a stored `_rp_meta` value (from `node.metadata`).
 * Returns an empty object when the value is missing or malformed so callers
 * can safely spread the result.
 */
export function decodeReplicateModelMeta(value: unknown): ReplicateModelMeta {
  if (typeof value !== "string" || value.length === 0) return {};
  try {
    const parsed = JSON.parse(value) as ReplicateModelMeta;
    return {
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Build the docs-dialog override fields for a Replicate-model node from the
 * model identifier and metadata persisted alongside it. Works whether
 * metadata is present or not so docs stay useful even on older nodes
 * created before the metadata input existed.
 */
export function deriveReplicateModelDocs(
  modelId: string,
  meta: ReplicateModelMeta
): { description: string; documentation: string; referenceUrl: string } {
  const referenceUrl = replicateModelUrl(modelId);
  const ownerName = replicateOwnerName(modelId);

  const description = meta.description ?? `Replicate model: ${ownerName}`;

  const lines: string[] = [
    "### Selected model",
    "",
    `- **Identifier**: \`${modelId}\``,
  ];
  if (meta.description) {
    lines.push("");
    lines.push(meta.description);
  }
  lines.push("");
  lines.push(
    `See the [Replicate model page](${referenceUrl}) for detailed parameter descriptions and usage examples.`
  );
  lines.push("");
  lines.push(
    "Paste a different identifier and click reload to rebuild the inputs and outputs from its schema. Reloading clears connected edges."
  );
  lines.push("");
  lines.push(
    "Browse the [Replicate model collection](https://replicate.com/explore) to find another model."
  );

  return { description, documentation: lines.join("\n"), referenceUrl };
}
