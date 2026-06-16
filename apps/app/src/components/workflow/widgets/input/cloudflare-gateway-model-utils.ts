import {
  CFG_META_KEY,
  CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE,
  type CloudflareGatewayModelMeta,
  cloudflareGatewayModelUrl,
  encodeCloudflareGatewayModelMeta,
} from "@dafthunk/types";

export type { CloudflareGatewayModelMeta } from "@dafthunk/types";
export {
  CFG_META_KEY,
  CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE,
  cloudflareGatewayModelUrl,
  encodeCloudflareGatewayModelMeta,
};

/**
 * Best-effort parse of a stored `_cfg_meta` value (from `node.metadata`).
 * Returns an empty object when the value is missing or malformed so callers
 * can safely spread the result.
 */
export function decodeCloudflareGatewayModelMeta(
  value: unknown
): CloudflareGatewayModelMeta {
  if (typeof value !== "string" || value.length === 0) return {};
  try {
    const parsed = JSON.parse(value) as CloudflareGatewayModelMeta;
    return {
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Build the docs-dialog override fields for a Cloudflare Gateway model node from
 * the model identifier and metadata persisted alongside it.
 */
export function deriveCloudflareGatewayModelDocs(
  modelId: string,
  meta: CloudflareGatewayModelMeta
): { description: string; documentation: string; referenceUrl: string } {
  const referenceUrl = cloudflareGatewayModelUrl(modelId);
  const description =
    meta.description ?? `Cloudflare Gateway model: ${modelId}`;

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
    `See the [Cloudflare model page](${referenceUrl}) for detailed parameter descriptions and usage.`
  );
  lines.push("");
  lines.push(
    "Paste a different identifier and click reload to rebuild the inputs and outputs from its schema. Reloading clears connected edges."
  );
  lines.push("");
  lines.push(
    "Browse the [Cloudflare model catalog](https://developers.cloudflare.com/ai/models/) to find another model."
  );

  return { description, documentation: lines.join("\n"), referenceUrl };
}
