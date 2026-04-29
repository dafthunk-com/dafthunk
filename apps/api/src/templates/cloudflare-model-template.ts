import {
  CF_LOCKED_KEY,
  CF_META_KEY,
  type CloudflareModelMeta,
  type Node,
  type Parameter,
} from "@dafthunk/types";

interface CloudflareModelNodeOptions {
  id: string;
  name: string;
  position: { x: number; y: number };
  /** Cloudflare Workers AI model identifier (e.g., `@cf/meta/llama-3.2-3b-instruct`). */
  model: string;
  /** Model-specific input Parameters (excluding the hidden `model` field, which is added automatically). */
  inputs: Parameter[];
  /** Model-specific output Parameters. */
  outputs: Parameter[];
  /** Static input values to pre-fill (overrides any `value` on the matching Parameter). */
  inputValues?: Record<string, unknown>;
  /** Set when the template wires Dafthunk tool refs into the `tools` input. */
  functionCalling?: boolean;
  /**
   * Display metadata mirroring what `buildModelNodeType` persists for
   * registry-spawned per-model nodes. Populates the `_cf_meta` blob the
   * docs dialog reads, and (when a `taskName` is set) drives the node icon
   * to match the catalog entry. Omit to fall back to the generic `bot`
   * icon and the default docs description.
   */
  meta?: CloudflareModelMeta;
}

/**
 * Build a `cloudflare-model` Node for use in workflow templates. The node's
 * static schema only declares the hidden `model` parameter; templates must
 * supply the model-specific inputs/outputs because the schema is normally
 * resolved client-side by the model picker widget.
 *
 * Templates pin a specific model and pre-wire its inputs/outputs, so the
 * resulting node is always emitted as locked (`_cf_locked: "true"`) — the
 * same shape `buildModelNodeType` produces for nodes dropped from the
 * palette. This suppresses the model picker so users can't destructively
 * swap the model and clear the template's edges.
 */
export function createCloudflareModelNode(
  opts: CloudflareModelNodeOptions
): Node {
  const inputs: Parameter[] = [
    {
      name: "model",
      type: "string",
      description: "Cloudflare Workers AI model identifier",
      required: true,
      hidden: true,
      value: opts.model,
    },
    ...opts.inputs.map((p) => {
      const override = opts.inputValues?.[p.name];
      // Cast: `override` is typed `unknown`, but each Parameter discriminant
      // carries its own `value` type. The caller is responsible for passing a
      // value compatible with the parameter's declared type.
      return override !== undefined
        ? ({ ...p, value: override } as Parameter)
        : ({ ...p } as Parameter);
    }),
  ];

  const metadata: Record<string, string> = {
    [CF_LOCKED_KEY]: "true",
  };
  if (opts.meta && (opts.meta.description || opts.meta.taskName)) {
    metadata[CF_META_KEY] = JSON.stringify(opts.meta);
  }

  const node: Node = {
    id: opts.id,
    name: opts.name,
    type: "cloudflare-model",
    icon: iconForTask(opts.meta?.taskName),
    position: opts.position,
    inputs,
    outputs: opts.outputs.map((o) => ({ ...o })),
    metadata,
  };

  if (opts.functionCalling) {
    node.functionCalling = true;
  }

  return node;
}

/**
 * Mirror of the catalog's task→icon mapping in
 * `runtime/cloudflare-model-catalog.ts`. Duplicated here (rather than
 * imported) so templates remain decoupled from the runtime catalog module.
 */
function iconForTask(taskName: string | undefined): string {
  if (!taskName) return "bot";
  switch (taskName) {
    case "Text Generation":
    case "Text Embeddings":
    case "Text Classification":
      return "sparkles";
    case "Automatic Speech Recognition":
    case "Speech Recognition":
    case "Text-to-Speech":
      return "mic";
    case "Text-to-Image":
    case "Image-to-Image":
    case "Image-to-Text":
    case "Image Classification":
    case "Object Detection":
      return "image";
    case "Translation":
      return "languages";
    case "Summarization":
      return "file-text";
    default:
      return "bot";
  }
}
