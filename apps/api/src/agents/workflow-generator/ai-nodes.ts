import type { CloudflareModelMeta, Node, NodeType } from "@dafthunk/types";

import {
  createCloudflareModelNode,
  LLAMA_3_3_70B_FP8_FAST,
} from "../../templates/cloudflare-model-template";

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
  pseudo(
    "ai-text",
    "AI Text",
    "Generate or transform text with an AI model. Use for summarizing, classifying, extracting, rewriting, answering, or drafting.",
    ["AI", "Text"],
    "sparkles",
    LLAMA_3_3_70B_FP8_FAST.model,
    LLAMA_3_3_70B_FP8_FAST.meta,
    [
      {
        name: "prompt",
        type: "string",
        description:
          "The full instruction, including any text to operate on. Build it with a template node when it mixes static wording and upstream values.",
        required: true,
      },
      {
        name: "max_tokens",
        type: "number",
        description: "Maximum length of the generated text, in tokens",
        hidden: true,
        value: 512,
      },
    ],
    [{ name: "response", type: "string", description: "The generated text" }]
  ),
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

/** Pseudo node types, in the same shape as registry types so they can be ranked together. */
export function pseudoNodeTypes(): NodeType[] {
  return PSEUDO_NODE_TYPES.map((p) => p.nodeType);
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
