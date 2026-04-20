import {
  ExecutableNode,
  isBlobParameter,
  type NodeContext,
  toUint8Array,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Parameter } from "@dafthunk/types";
import {
  type CloudflareModelPricing,
  getCloudflareModelPricing,
} from "../../utils/cloudflare-pricing";
import { calculateTokenUsage } from "../../utils/usage";

const BLOB_TYPES = new Set(["image", "audio", "video", "blob"]);

// Node config inputs that should not be forwarded to the AI binding.
// `_cf_meta` carries UI-only metadata persisted from the model picker.
const CONFIG_INPUTS = new Set(["model", "_cf_meta"]);

const MIME_FALLBACKS: Record<string, string> = {
  image: "image/png",
  audio: "audio/mpeg",
  video: "video/mp4",
  blob: "application/octet-stream",
};

/**
 * Decode a base64-encoded string to a Uint8Array.
 * Handles raw base64 as well as data URLs (`data:<mime>;base64,<payload>`).
 */
function decodeBase64(value: string): Uint8Array {
  const payload = value.startsWith("data:")
    ? value.slice(value.indexOf(",") + 1)
    : value;
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Infer the MIME type for a blob-typed output from its Dafthunk parameter
 * type. The schema mapper currently doesn't preserve the schema's
 * `contentType` on Parameters, so we rely on the blob subtype (image/audio/
 * video/blob). `format` is intentionally NOT used here — it carries the
 * encoding hint (`"base64"`), not a MIME type.
 */
function inferMimeType(type: string): string {
  return MIME_FALLBACKS[type] ?? "application/octet-stream";
}

async function streamToBlob(stream: ReadableStream): Promise<Uint8Array> {
  const response = new Response(stream);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Generic Cloudflare Workers AI model node that executes any model listed in
 * the Cloudflare catalog, with inputs and outputs derived from the model's
 * published JSON schema. The `model` input is the only static parameter; all
 * others are added dynamically by the frontend widget when the user loads a
 * model schema.
 *
 * @see https://developers.cloudflare.com/api/node/resources/ai/subresources/models/subresources/schema
 */
export class CloudflareModelNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-model",
    name: "Cloudflare Model",
    type: "cloudflare-model",
    description:
      "Run any model from the Cloudflare Workers AI catalog. A searchable dropdown lists every available model; picking one rebuilds the node's inputs and outputs from its published schema.",
    documentation: `Run any of the models available in the [Cloudflare Workers AI catalog](https://developers.cloudflare.com/workers-ai/models/).

### How to use

1. Click the model selector on the node — a dropdown opens with the full catalog grouped by task (Text Generation, Text-to-Image, Translation, …)
2. Type in the **search field** at the top of the dropdown to filter by identifier, description or task
3. Click a model — the node's inputs and outputs update to match the model's published schema
4. Connect parameters and run the workflow

When the schema changes, connected edges are cleared to prevent type mismatches. If you want to switch models without losing wiring, duplicate the node first.

### Loading a model that isn't listed

If you type a well-formed identifier (e.g. \`@cf/meta/llama-3.3-70b-instruct-fp8-fast\`) that isn't returned by Cloudflare's search, a **Load "…"** row appears at the bottom of the dropdown. Use it to fetch the schema for models Cloudflare hasn't yet surfaced in their catalog.

### Model identifier format

- \`@cf/<provider>/<model>\` — Cloudflare-hosted models
- \`@hf/<provider>/<model>\` — Hugging Face partner models

For example: \`@cf/meta/llama-3.2-3b-instruct\`, \`@cf/openai/whisper\`, \`@cf/black-forest-labs/flux-1-schnell\`.`,
    referenceUrl: "https://developers.cloudflare.com/workers-ai/models/",
    tags: ["AI", "Cloudflare", "Generic"],
    icon: "bot",
    inlinable: false,
    usage: 1,
    inputs: [
      {
        name: "model",
        type: "string",
        description:
          "Cloudflare Workers AI model identifier (e.g., @cf/meta/llama-3.2-3b-instruct)",
        required: true,
        hidden: true,
      },
    ],
    outputs: [],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const modelInput = context.inputs.model;
      if (!modelInput || typeof modelInput !== "string") {
        return this.createErrorResult(
          "Model identifier is required (e.g., '@cf/meta/llama-3.2-3b-instruct')"
        );
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const aiInput = this.buildAiInput(context);
      const promptBytes = JSON.stringify(aiInput).length;

      const result = await context.env.AI.run(
        modelInput as keyof AiModels,
        aiInput as never,
        context.env.AI_OPTIONS
      );

      return await this.processOutput(modelInput, promptBytes, result);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Build the AI.run() input payload from context inputs, converting blob
   * parameters into the byte-array form Workers AI models expect.
   */
  private buildAiInput(context: NodeContext): Record<string, unknown> {
    const input: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context.inputs)) {
      if (CONFIG_INPUTS.has(key) || value === undefined || value === null)
        continue;

      const paramDef = this.node.inputs?.find((p) => p.name === key);
      const isBlobType = paramDef && BLOB_TYPES.has(paramDef.type);

      if (isBlobType && isBlobParameter(value)) {
        input[key] = Array.from(toUint8Array(value.data));
        continue;
      }

      input[key] = value;
    }

    return input;
  }

  /**
   * Convert the model's raw response into a NodeExecution result.
   * Handles ReadableStream (binary), multi-output objects (including base64
   * blobs), arrays (json), and plain strings/numbers.
   */
  private async processOutput(
    modelId: string,
    promptBytes: number,
    result: unknown
  ): Promise<NodeExecution> {
    const outputs = this.node.outputs ?? [];

    // Binary stream — the node must have a single blob-typed output
    if (result instanceof ReadableStream) {
      const bytes = await streamToBlob(result);
      if (bytes.length === 0) {
        throw new Error("Received empty binary output from Cloudflare AI");
      }
      const outputDef = outputs[0];
      const type = outputDef?.type ?? "blob";
      const usage = this.computeUsage(
        modelId,
        undefined,
        bytes.length,
        promptBytes
      );
      return this.createSuccessResult(
        {
          [outputDef?.name ?? "output"]: {
            data: bytes,
            mimeType: inferMimeType(type),
          },
        },
        usage
      );
    }

    // Object response — distribute fields onto named outputs (decoding base64
    // blobs along the way)
    if (
      result !== null &&
      typeof result === "object" &&
      !Array.isArray(result)
    ) {
      return this.processObjectOutput(
        modelId,
        promptBytes,
        result as Record<string, unknown>
      );
    }

    // Array / primitive → single output
    const outputDef = outputs[0];
    const responseBytes = JSON.stringify(result).length;
    const usage = this.computeUsage(
      modelId,
      undefined,
      responseBytes,
      promptBytes
    );
    return this.createSuccessResult(
      { [outputDef?.name ?? "output"]: result },
      usage
    );
  }

  private processObjectOutput(
    modelId: string,
    promptBytes: number,
    result: Record<string, unknown>
  ): NodeExecution {
    const outputs = this.node.outputs ?? [];
    const payload: Record<string, unknown> = {};
    let decodedBlobBytes = 0;

    if (outputs.length === 0) {
      const responseBytes = JSON.stringify(result).length;
      const usage = this.computeUsage(
        modelId,
        extractResponseUsage(result),
        responseBytes,
        promptBytes
      );
      return this.createSuccessResult({ output: result }, usage);
    }

    for (const outputDef of outputs) {
      const value = result[outputDef.name];
      if (value === undefined) continue;

      if (BLOB_TYPES.has(outputDef.type)) {
        const blob = this.decodeBlobOutput(outputDef, value);
        decodedBlobBytes += blob.data.length;
        payload[outputDef.name] = blob;
        continue;
      }

      payload[outputDef.name] = value;
    }

    // Prefer decoded blob bytes for bytes-per-* estimators; fall back to the
    // JSON length of the raw response when no blob was decoded.
    const responseBytes =
      decodedBlobBytes > 0 ? decodedBlobBytes : JSON.stringify(result).length;
    const usage = this.computeUsage(
      modelId,
      extractResponseUsage(result),
      responseBytes,
      promptBytes
    );
    return this.createSuccessResult(payload, usage);
  }

  /**
   * Decode a blob-typed field from the model's response:
   *  - base64-encoded string → Uint8Array
   *  - byte array → Uint8Array
   *  - blob parameter passthrough
   */
  private decodeBlobOutput(
    outputDef: Parameter,
    value: unknown
  ): { data: Uint8Array; mimeType: string } {
    const mimeType = inferMimeType(outputDef.type);

    if (typeof value === "string") {
      return { data: decodeBase64(value), mimeType };
    }
    if (Array.isArray(value)) {
      return { data: new Uint8Array(value as number[]), mimeType };
    }
    if (isBlobParameter(value)) {
      return { data: toUint8Array(value.data), mimeType: value.mimeType };
    }

    throw new Error(
      `Cannot decode blob output '${outputDef.name}' of type ${typeof value}`
    );
  }

  /**
   * Compute the credit cost of a single execution by combining per-model
   * pricing with whatever usage signal the response provides.
   *
   *  - Known model + "tokens" estimator + response.usage → charge by actual
   *    prompt/completion tokens reported by the model.
   *  - Known model + byte estimator (or missing usage block) → estimate
   *    input tokens from prompt length and output tokens from response bytes,
   *    matching the heuristics that single-model nodes already use.
   *  - Unknown model → fall back to 1 credit and log a warning so operators
   *    notice the gap in `cloudflare-pricing.ts`.
   */
  private computeUsage(
    modelId: string,
    responseUsage: ResponseUsage | undefined,
    responseBytes: number,
    promptBytes: number
  ): number {
    const pricing = getCloudflareModelPricing(modelId);
    if (!pricing) {
      console.warn(
        `[cloudflare-model] No pricing entry for "${modelId}"; using flat 1 credit.`
      );
      return 1;
    }

    if (pricing.outputEstimator === "tokens" && responseUsage) {
      const inputTokens = responseUsage.prompt_tokens ?? 0;
      const outputTokens =
        responseUsage.completion_tokens ??
        Math.max(0, (responseUsage.total_tokens ?? 0) - inputTokens);
      return calculateTokenUsage(inputTokens, outputTokens, pricing);
    }

    return calculateTokenUsage(
      estimateInputTokens(promptBytes),
      estimateOutputTokens(responseBytes, pricing),
      pricing
    );
  }
}

interface ResponseUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

function extractResponseUsage(
  result: Record<string, unknown>
): ResponseUsage | undefined {
  const usage = result.usage;
  if (!usage || typeof usage !== "object") return undefined;
  return usage as ResponseUsage;
}

/** Rough conversion from serialised prompt bytes to token count (~4 bytes/token). */
function estimateInputTokens(promptBytes: number): number {
  return Math.ceil(promptBytes / 4);
}

/**
 * Convert decoded response bytes to the output-token count used by pricing.
 * Mirrors the heuristics in the dedicated single-model nodes:
 *   - images: bytes / 1000
 *   - audio:  bytes / 100
 *   - token-priced responses with no usage block: fall back to bytes / 4
 */
function estimateOutputTokens(
  responseBytes: number,
  pricing: CloudflareModelPricing
): number {
  switch (pricing.outputEstimator) {
    case "bytes-per-1000":
      return Math.ceil(responseBytes / 1000);
    case "bytes-per-100":
      return Math.ceil(responseBytes / 100);
    default:
      return Math.ceil(responseBytes / 4);
  }
}
