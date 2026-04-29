import { type CloudflareModelMeta, cloudflareDocsUrl } from "@dafthunk/types";

export type { CloudflareModelMeta } from "@dafthunk/types";
export {
  CF_LOCKED_KEY,
  CF_META_KEY,
  CLOUDFLARE_MODEL_NODE_TYPE,
  cloudflareDocsUrl,
  encodeCloudflareModelMeta,
  shortName,
} from "@dafthunk/types";

/**
 * Best-effort parse of a stored `_cf_meta` value (from `node.metadata`).
 * Returns an empty object when the value is missing or malformed so callers
 * can safely spread the result.
 */
export function decodeCloudflareModelMeta(value: unknown): CloudflareModelMeta {
  if (typeof value !== "string" || value.length === 0) return {};
  try {
    const parsed = JSON.parse(value) as CloudflareModelMeta;
    return {
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
      taskName:
        typeof parsed.taskName === "string" ? parsed.taskName : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Build the docs-dialog override fields for a Cloudflare-model node from
 * the model identifier and the metadata persisted alongside it. Works
 * whether metadata is present or not so docs stay useful even on older
 * nodes created before the metadata input existed.
 */
export function deriveCloudflareModelDocs(
  modelId: string,
  meta: CloudflareModelMeta
): { description: string; documentation: string; referenceUrl: string } {
  const referenceUrl = cloudflareDocsUrl(modelId);

  const description =
    meta.description ??
    (meta.taskName
      ? `${meta.taskName}: ${modelId}`
      : `Cloudflare Workers AI model: ${modelId}`);

  const lines: string[] = [
    "### Selected model",
    "",
    `- **Identifier**: \`${modelId}\``,
  ];
  if (meta.taskName) lines.push(`- **Task**: ${meta.taskName}`);
  if (meta.description) {
    lines.push("");
    lines.push(meta.description);
  }
  lines.push("");
  lines.push(
    `See the [Cloudflare model page](${referenceUrl}) for detailed parameter descriptions and usage examples.`
  );
  lines.push("");
  lines.push(
    "Pick a different model from the search dialog on the node to rebuild the inputs and outputs from its schema. Switching models clears connected edges."
  );

  return { description, documentation: lines.join("\n"), referenceUrl };
}
