import { runWithTools } from "@cloudflare/ai-utils";
import {
  ExecutableNode,
  isBlobParameter,
  type NodeContext,
  ToolCallTracker,
  type ToolReference,
  toUint8Array,
} from "@dafthunk/runtime";
import type {
  NodeExecution,
  NodeType,
  Parameter,
  Schema,
} from "@dafthunk/types";
import {
  type CloudflareModelPricing,
  getCloudflareModelPricing,
} from "../../utils/cloudflare-pricing";
import { schemaToJsonSchema } from "../../utils/schema-to-json-schema";
import { calculateTokenUsage } from "../../utils/usage";

const BLOB_TYPES = new Set(["image", "audio", "video", "blob"]);

interface ChatMessage {
  role: string;
  content: string;
}

// Inputs that drive node behavior but aren't forwarded to AI.run as part
// of the input payload. `model` selects the Workers AI model; `schema` is
// a Dafthunk-typed shortcut that the runtime translates into the
// model-native `response_format` field. Editor-only flags (display
// metadata, picker locks) ride on `node.metadata` instead of `inputs`, so
// they don't reach the runtime here.
const CONFIG_INPUTS = new Set(["model", "schema"]);

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

      const { input: aiInput, promptBytes } = this.buildAiInput(context);
      const schemaInput = extractSchemaInput(context.inputs.schema);
      const toolRefs = extractDafthunkToolRefs(aiInput.tools);

      if (toolRefs.length > 0) {
        return await this.executeWithTools(
          context,
          modelInput,
          aiInput,
          toolRefs,
          schemaInput,
          promptBytes
        );
      }

      // Native structured-output path. The catalog only surfaces the
      // `schema` Dafthunk input on models whose published schema includes
      // `response_format`, so setting it directly here is safe. Schema
      // wins over a manually-pasted `response_format` JSON value — the
      // schema picker is the friendly path and is checked into the
      // workflow, while raw JSON tends to drift.
      if (schemaInput) {
        aiInput.response_format = buildJsonSchemaResponseFormat(schemaInput);
      }

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
   * Function-calling path. When the user wires Dafthunk tool references into
   * the `tools` input, resolve them via the tool registry and run a multi-turn
   * agent loop with `runWithTools`. The tool calls executed during the loop
   * are surfaced on the `tool_calls` output (when the model schema declares
   * one).
   */
  private async executeWithTools(
    context: NodeContext,
    modelId: string,
    aiInput: Record<string, unknown>,
    toolRefs: ToolReference[],
    schemaInput: Schema | null,
    promptBytes: number
  ): Promise<NodeExecution> {
    const toolDefinitions = await this.convertFunctionCallsToToolDefinitions(
      toolRefs,
      context
    );

    if (toolDefinitions.length === 0) {
      // Fall back to plain AI.run when the registry can't resolve any tool.
      // The structured-output translation still applies here.
      if (schemaInput) {
        aiInput.response_format = buildJsonSchemaResponseFormat(schemaInput);
      }
      const result = await context.env.AI.run(
        modelId as keyof AiModels,
        aiInput as never,
        context.env.AI_OPTIONS
      );
      return await this.processOutput(modelId, promptBytes, result);
    }

    const messages = buildMessagesFromInput(aiInput);
    if (!messages) {
      return this.createErrorResult(
        "Tool calling requires a `prompt` or `messages` input."
      );
    }

    // `runWithTools` controls the request shape and doesn't reliably forward
    // `response_format`, so when the user combines tools with a schema we
    // fall back to a system-message instruction. The model still runs the
    // tool loop normally; the constraint applies to the final reply.
    const finalMessages = schemaInput
      ? prependSchemaSystemMessage(messages, schemaInput)
      : messages;

    const tracker = new ToolCallTracker();
    const trackedTools = tracker.wrapToolDefinitions(toolDefinitions);

    // `runWithTools` rebuilds messages and tools internally; pass the rest of
    // the inputs through (temperature, max_tokens, etc.) but strip the keys it
    // owns to avoid duplication.
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(aiInput)) {
      if (k !== "tools" && k !== "prompt" && k !== "messages") rest[k] = v;
    }

    const result = (await runWithTools(
      context.env.AI as never,
      modelId as never,
      {
        messages: finalMessages,
        tools: trackedTools,
        ...rest,
      } as never
    )) as unknown;

    const executedToolCalls = tracker.getToolCalls();
    const augmented =
      result &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      !(result instanceof ReadableStream) &&
      executedToolCalls.length > 0
        ? {
            ...(result as Record<string, unknown>),
            tool_calls: executedToolCalls,
          }
        : result;

    return await this.processOutput(modelId, promptBytes, augmented);
  }

  /**
   * Build the AI.run() input payload from context inputs, converting blob
   * parameters into the byte-array form Workers AI models expect. Tracks an
   * approximate prompt byte count alongside the payload so the pricing
   * estimator doesn't have to re-stringify the (potentially MB-sized) blob
   * arrays after the fact.
   */
  private buildAiInput(context: NodeContext): {
    input: Record<string, unknown>;
    promptBytes: number;
  } {
    const input: Record<string, unknown> = {};
    let promptBytes = 0;

    for (const [key, value] of Object.entries(context.inputs)) {
      if (CONFIG_INPUTS.has(key) || value === undefined || value === null)
        continue;

      const paramDef = this.node.inputs?.find((p) => p.name === key);
      const isBlobType = paramDef && BLOB_TYPES.has(paramDef.type);

      if (isBlobType && isBlobParameter(value)) {
        const bytes = toUint8Array(value.data);
        input[key] = Array.from(bytes);
        promptBytes += bytes.length;
        continue;
      }

      input[key] = value;
      promptBytes += JSON.stringify(value).length;
    }

    return { input, promptBytes };
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
 * Detect a non-empty array of Dafthunk-shaped tool references on the `tools`
 * input. Returns `[]` for any other shape (empty array, raw Cloudflare tool
 * schemas, undefined, etc.) so the node falls through to a plain `AI.run`.
 */
function extractDafthunkToolRefs(value: unknown): ToolReference[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  const isDafthunkRef = value.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as { type?: unknown }).type === "string" &&
      typeof (item as { identifier?: unknown }).identifier === "string"
  );
  return isDafthunkRef ? (value as ToolReference[]) : [];
}

/**
 * `runWithTools` operates on a chat-style messages array. Build one from
 * either a `messages` input (array or JSON-encoded string) or a single
 * `prompt` string. Returns `null` when neither is usable.
 */
function buildMessagesFromInput(
  aiInput: Record<string, unknown>
): ChatMessage[] | null {
  const { messages, prompt } = aiInput;

  if (Array.isArray(messages) && messages.length > 0) {
    return messages as ChatMessage[];
  }

  if (typeof messages === "string") {
    try {
      const parsed = JSON.parse(messages);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through to prompt
    }
  }

  if (typeof prompt === "string" && prompt.length > 0) {
    return [{ role: "user", content: prompt }];
  }

  return null;
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

/**
 * Type guard for a resolved Dafthunk Schema. Picked schemas come through
 * the parameter mapper as either a fully hydrated Schema object (from
 * SchemaService) or a raw JSON string the user pasted. Anything else
 * (null/undefined/wired upstream non-schema) falls through to `null`.
 */
function extractSchemaInput(value: unknown): Schema | null {
  if (
    value &&
    typeof value === "object" &&
    "fields" in value &&
    Array.isArray((value as Schema).fields)
  ) {
    return value as Schema;
  }
  return null;
}

/**
 * Wrap a Dafthunk Schema as the OpenAI-style `response_format` payload that
 * Cloudflare Workers AI accepts on Llama 3.x, Mistral and similar models.
 */
function buildJsonSchemaResponseFormat(schema: Schema): {
  type: "json_schema";
  json_schema: { name: string; schema: Record<string, unknown> };
} {
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name || "Response",
      schema: schemaToJsonSchema(schema),
    },
  };
}

/**
 * Tool-calling fallback: prepend a system message instructing the model to
 * reply in JSON matching the schema. Used when `runWithTools` controls the
 * request shape and won't reliably forward `response_format`.
 */
function prependSchemaSystemMessage(
  messages: ChatMessage[],
  schema: Schema
): ChatMessage[] {
  const jsonSchema = schemaToJsonSchema(schema);
  return [
    {
      role: "system",
      content: `You MUST respond with valid JSON matching this schema:\n${JSON.stringify(jsonSchema)}`,
    },
    ...messages,
  ];
}
