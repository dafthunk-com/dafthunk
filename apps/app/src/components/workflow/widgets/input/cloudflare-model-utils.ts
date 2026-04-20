import type { CloudflareModelInfo } from "@dafthunk/types";

/**
 * Node-type identifier for the generic Cloudflare Workers AI model node.
 * Matches `CloudflareModelNode.nodeType.type` in the runtime package and is
 * referenced by both the widget registration and the docs-override lookup
 * in `workflow-node.tsx`.
 */
export const CLOUDFLARE_MODEL_NODE_TYPE = "cloudflare-model";

/**
 * Hidden input name used to round-trip per-model metadata (description,
 * task) through the backend save path. The docs dialog reads this input's
 * value at render time and synthesises description/documentation fields
 * from it — storing them directly on node data doesn't survive the save
 * round-trip because the backend wire format only preserves inputs/outputs.
 */
export const CF_META_INPUT_NAME = "_cf_meta";

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

/**
 * Best-effort parse of a stored `_cf_meta` input value. Returns an empty
 * object when the value is missing or malformed so callers can safely
 * spread the result.
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
