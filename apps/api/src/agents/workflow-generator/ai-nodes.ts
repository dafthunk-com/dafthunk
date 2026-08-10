import type {
  CloudflareModelInfo,
  CloudflareModelMeta,
  Node,
  NodeType,
} from "@dafthunk/types";

import { createCloudflareModelNode } from "../../templates/cloudflare-model-template";

/**
 * Curated stand-ins for Workers AI, shown to the model instead of the raw
 * `cloudflare-model` node.
 *
 * Two reasons this indirection exists. First, `cloudflare-model`'s registry
 * NodeType declares `outputs: []` — its real ports are resolved client-side by
 * the model picker — so anything that hydrates it straight from the registry
 * produces a port-less node. Second, plain Workers AI needs no subscription, no
 * user API key, no OAuth and no org resource, which is what lets a generated
 * workflow actually run on the first attempt. Every shipped template already
 * uses these models for the same reason.
 */
interface PseudoNodeType {
  nodeType: NodeType;
  model: string;
  meta: CloudflareModelMeta;
}

function pseudo(
  type: string,
  name: string,
  description: string,
  tags: string[],
  icon: string,
  model: string,
  meta: CloudflareModelMeta,
  inputs: NodeType["inputs"],
  outputs: NodeType["outputs"]
): PseudoNodeType {
  return {
    nodeType: {
      id: type,
      name,
      type,
      description,
      tags,
      icon,
      inputs,
      outputs,
    },
    model,
    meta,
  };
}

const PSEUDO_NODE_TYPES: PseudoNodeType[] = [
  /**
   * `ai-text` stood here and was removed, not merely delisted.
   *
   * Delisting from `CORE_NODE_TYPES` was not enough: `pipeline.ts` ranks every
   * pseudo type alongside the registry, so a stand-in whose description begins
   * "Use for summarizing, classifying, extracting" wins the very requests it
   * was meant to stop serving. A node the generator must not choose has to be
   * absent from the pool, not merely unpinned.
   *
   * It was a stand-in for Workers AI text generation, which the agent node now
   * covers — see the reasoning in `core-nodes.ts`, and the cost it accepts.
   * Image and transcription keep theirs, having no Anthropic equivalent.
   */
  pseudo(
    "ai-image",
    "AI Image",
    "Generate an image from a text description.",
    ["AI", "Image"],
    "image",
    "@cf/black-forest-labs/flux-1-schnell",
    {
      description: "FLUX.1 schnell text-to-image model.",
      taskName: "Text-to-Image",
    },
    [
      {
        name: "prompt",
        type: "string",
        description: "Description of the image to generate",
        required: true,
      },
    ],
    [{ name: "image", type: "image", description: "The generated image" }]
  ),
  pseudo(
    "ai-transcribe",
    "AI Transcribe",
    "Transcribe spoken audio into text.",
    ["AI", "Audio"],
    "mic",
    "@cf/openai/whisper",
    {
      description: "Whisper automatic speech recognition.",
      taskName: "Automatic Speech Recognition",
    },
    [
      {
        name: "audio",
        type: "audio",
        description: "The audio to transcribe",
        required: true,
      },
    ],
    [{ name: "text", type: "string", description: "The transcribed text" }]
  ),
];

const BY_TYPE = new Map(PSEUDO_NODE_TYPES.map((p) => [p.nodeType.type, p]));

/** Upstream text is a detail line in a catalog entry, not an essay. */
const MAX_UPSTREAM_DESCRIPTION = 160;

/**
 * Pseudo node types, in the same shape as registry types so they can be
 * ranked together.
 *
 * Given the live model catalog, each pinned model's upstream description is
 * appended to the hand-written capability line — so what the generator reads
 * evolves with Cloudflare's catalog while the curation (which models, which
 * capabilities) stays a decision. The hand-written text is the fallback, and
 * membership never changes here: a new upstream model stays out until it is
 * chosen on purpose.
 */
export function pseudoNodeTypes(catalog?: CloudflareModelInfo[]): NodeType[] {
  if (!catalog?.length) return PSEUDO_NODE_TYPES.map((p) => p.nodeType);

  // Upstream `name` carries the "@cf/…" path; `id` is an opaque UUID.
  const byModel = new Map(catalog.map((model) => [model.name, model]));
  return PSEUDO_NODE_TYPES.map((p) => {
    const upstream = byModel.get(p.model)?.description?.trim();
    if (!upstream) return p.nodeType;
    const detail =
      upstream.length <= MAX_UPSTREAM_DESCRIPTION
        ? upstream
        : `${upstream.slice(0, MAX_UPSTREAM_DESCRIPTION - 1)}…`;
    return {
      ...p.nodeType,
      description: `${p.nodeType.description} ${detail}`,
    };
  });
}

/**
 * Expands a pseudo type into a real `cloudflare-model` node, pinned to its
 * model and carrying explicit ports.
 */
export function expandPseudoNode(
  type: string,
  options: {
    id: string;
    name?: string;
    position: { x: number; y: number };
    inputs?: Record<string, unknown>;
  }
): Node | undefined {
  const entry = BY_TYPE.get(type);
  if (!entry) return undefined;

  // The hidden `model` input is supplied by createCloudflareModelNode itself.
  const declared = entry.nodeType.inputs.filter((p) => p.name !== "model");

  return createCloudflareModelNode({
    id: options.id,
    name: options.name ?? entry.nodeType.name,
    position: options.position,
    model: entry.model,
    meta: entry.meta,
    inputs: declared,
    outputs: entry.nodeType.outputs,
    inputValues: options.inputs,
  });
}
