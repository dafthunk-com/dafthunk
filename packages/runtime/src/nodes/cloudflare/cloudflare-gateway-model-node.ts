import {
  isBlobParameter,
  MultiStepNode,
  type MultiStepNodeContext,
  type ParameterValue,
  toUint8Array,
} from "@dafthunk/runtime";
import {
  CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME,
  CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE,
  CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME,
  type NodeExecution,
  type NodeType,
  type ObjectReference,
} from "@dafthunk/types";

const BLOB_TYPES = new Set(["image", "audio", "video", "blob"]);

// Inputs that drive node behavior but are not forwarded to the model payload.
const CONFIG_INPUTS = new Set([
  CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME,
  CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME,
]);

const MIME_FALLBACKS: Record<string, string> = {
  image: "image/png",
  audio: "audio/mpeg",
  video: "video/mp4",
  blob: "application/octet-stream",
};

// Partner models billed through Cloudflare Unified Billing; the Dafthunk credit
// here covers metering only — the real spend is deducted from CF credits.
const GATEWAY_USAGE = 100;

/**
 * Ceiling on a file downloaded from a returned link.
 *
 * A budget rather than a guess: the response body is held once, as a view
 * over the buffer it arrived in, and the runtime's blob writer now hands
 * those same bytes to the object store instead of round-tripping them
 * through a Blob. So this many megabytes of video costs about this many
 * megabytes of memory, against an isolate limited to 128MB and shared with
 * whatever else it is serving.
 *
 * It exists so an oversized file arrives as a message naming the size rather
 * than an out-of-memory kill, which arrives as a dead worker and no
 * explanation. Raising it much further means not holding the file at all —
 * streaming the response into R2, which the object store cannot do yet.
 */
const MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;

/**
 * The link a provider returns instead of bytes, in either shape it uses: a
 * bare URL string, or the `{ url }` object the file inputs use.
 *
 * Anything else — a data URI, a relative path, a task id — is left alone and
 * passed through as an ordinary value.
 */
function asDownloadUrl(value: unknown): string | undefined {
  const candidate =
    typeof value === "string"
      ? value
      : typeof value === "object" && value !== null
        ? (value as { url?: unknown }).url
        : undefined;
  if (typeof candidate !== "string") return undefined;
  return /^https:\/\//i.test(candidate) ? candidate : undefined;
}

/**
 * Generic node for third-party models served through Cloudflare's unified AI
 * Gateway REST API (the `author/model` catalog). Unlike the `cloudflare-model`
 * node — which runs `@cf/...` Workers AI models inline — this routes partner
 * providers (xAI, OpenAI, …) through the gateway with Unified Billing.
 *
 * File-output models (e.g. `xai/grok-imagine-video`) require an
 * `output.upload_url`: the runtime presigns an R2 upload destination, the
 * provider PUTs the file there, and we read it back as a blob output.
 *
 * @see https://developers.cloudflare.com/ai-gateway/usage/rest-api/
 */
export class CloudflareGatewayModelNode extends MultiStepNode {
  public static readonly nodeType: NodeType = {
    id: "cloudflare-gateway-model",
    name: "Cloudflare Gateway Model",
    type: CLOUDFLARE_GATEWAY_MODEL_NODE_TYPE,
    description:
      "Run any third-party model from Cloudflare's unified AI catalog (xAI, OpenAI, Google, …) through the AI Gateway. Enter an author/model identifier, load its schema, and the node's inputs and outputs adapt automatically.",
    documentation: `Run any model from [Cloudflare's unified AI catalog](https://developers.cloudflare.com/ai/models/), including partner providers like xAI, OpenAI, Anthropic and Google, billed through Cloudflare [Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/).

### How to use

1. Browse the [model catalog](https://developers.cloudflare.com/ai/models/) and find a model
2. Copy its \`author/model\` identifier (e.g. \`xai/grok-imagine-video\`)
3. Paste it into this node and click **Load**
4. The node's inputs and outputs update to match the model's published schema

### Notes

- Third-party models are billed via Cloudflare Unified Billing — load credits on your account first.
- File-output models (video, image) deliver their result to a presigned upload URL handled automatically by the node.

For example: \`xai/grok-imagine-video\`, \`openai/gpt-image-1.5\`, \`google/gemini-3-flash\`.`,
    referenceUrl: "https://developers.cloudflare.com/ai/models/",
    tags: ["AI", "Cloudflare", "Generic"],
    icon: "bot",
    inlinable: false,
    usage: GATEWAY_USAGE,
    asTool: false,
    inputs: [
      {
        name: CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME,
        type: "string",
        description:
          "Cloudflare unified model identifier in the format author/model (e.g. xai/grok-imagine-video)",
        required: true,
        hidden: true,
      },
    ],
    outputs: [],
  };

  public async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    try {
      const modelInput = context.inputs[CLOUDFLARE_GATEWAY_MODEL_INPUT_NAME];
      if (typeof modelInput !== "string" || !modelInput.trim()) {
        return this.createErrorResult(
          "Model identifier is required (e.g., 'xai/grok-imagine-video')"
        );
      }
      const model = modelInput.trim();
      if (!/^[^/\s@]+\/[^\s]+$/.test(model)) {
        return this.createErrorResult(
          `Invalid model identifier "${model}" — expected author/model (e.g. xai/grok-imagine-video)`
        );
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const input = await this.buildInput(context);

      // File-output models need an upload destination. Presign an R2 PUT URL,
      // hand it to the provider, and read the produced file back afterwards.
      const needsUpload = (this.node.inputs ?? []).some(
        (p) => p.name === CLOUDFLARE_GATEWAY_UPLOAD_INPUT_NAME
      );
      const uploadType = this.node.outputs?.[0]?.type ?? "blob";
      const uploadStore = needsUpload ? context.objectStore : undefined;
      let uploadReference: ObjectReference | null = null;
      if (needsUpload) {
        if (!uploadStore) {
          return this.createErrorResult(
            "ObjectStore not available (required for this model's file output)"
          );
        }
        const { uploadUrl, reference } = await uploadStore.presignUpload(
          MIME_FALLBACKS[uploadType] ?? MIME_FALLBACKS.blob,
          context.organizationId
        );
        uploadReference = reference;
        input.output = { upload_url: uploadUrl };
      }

      const gatewayId = context.env.CLOUDFLARE_AI_GATEWAY_ID ?? "default";
      const options = {
        ...(context.env.AI_OPTIONS ?? {}),
        gateway: { id: gatewayId },
      };

      const result = await context.doStep(() =>
        context.env.AI.run(
          model as keyof AiModels,
          input as never,
          options as never
        )
      );

      if (uploadStore && uploadReference) {
        return await this.readUploadedOutput(uploadStore, uploadReference);
      }
      return await this.processInlineOutput(result);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Build the model payload from context inputs. Blob inputs are presigned to a
   * GET URL and wrapped in the `{ url }` shape Cloudflare's unified schemas
   * expect (single value, or an array for repeated inputs).
   */
  private async buildInput(
    context: MultiStepNodeContext
  ): Promise<Record<string, unknown>> {
    const paramByName = new Map(
      (this.node.inputs ?? []).map((p) => [p.name, p])
    );
    const input: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context.inputs)) {
      if (CONFIG_INPUTS.has(key) || value === undefined || value === null) {
        continue;
      }

      const paramDef = paramByName.get(key);
      if (paramDef && BLOB_TYPES.has(paramDef.type)) {
        const wrapped = await this.presignBlobInput(
          context,
          key,
          value,
          paramDef.repeated ?? false
        );
        if (wrapped !== undefined) {
          input[key] = wrapped;
          continue;
        }
      }

      input[key] = value;
    }

    return input;
  }

  // Accepts blob parameters, string URLs, and arrays mixing both. Returns the
  // `{ url }` (or `[{ url }]`) shape, or undefined to fall through to the raw
  // value passthrough.
  private async presignBlobInput(
    context: MultiStepNodeContext,
    key: string,
    value: unknown,
    repeated: boolean
  ): Promise<{ url: string } | { url: string }[] | undefined> {
    const toUrl = async (item: unknown): Promise<string | undefined> => {
      if (isBlobParameter(item)) {
        if (!context.objectStore) {
          throw new Error(
            `ObjectStore not available (required for blob input "${key}")`
          );
        }
        return context.objectStore.writeAndPresign(
          toUint8Array(item.data as Uint8Array | Record<string, number>),
          item.mimeType,
          context.organizationId
        );
      }
      if (typeof item === "string" && item.length > 0) return item;
      return undefined;
    };

    if (Array.isArray(value)) {
      const resolved = await Promise.all(value.map(toUrl));
      const urls = resolved
        .filter((url): url is string => url !== undefined)
        .map((url) => ({ url }));
      if (urls.length === 0) {
        throw new Error(
          `Input "${key}" is an array but contains no blob or URL values`
        );
      }
      return urls;
    }

    const url = await toUrl(value);
    if (url === undefined) return undefined;
    return repeated ? [{ url }] : { url };
  }

  /**
   * Read the file the provider uploaded to our presigned destination, return it
   * as the node's first (blob) output, then remove the transient R2 object —
   * the runtime re-stores the returned bytes with proper org metadata.
   */
  private async readUploadedOutput(
    objectStore: NonNullable<MultiStepNodeContext["objectStore"]>,
    reference: ObjectReference
  ): Promise<NodeExecution> {
    const stored = await objectStore.readObject(reference);
    if (!stored || stored.data.length === 0) {
      return this.createErrorResult(
        "Model reported success but no file was uploaded to the output destination"
      );
    }

    const outputDef = this.node.outputs?.[0];
    const name = outputDef?.name ?? "output";
    const type = outputDef?.type ?? "blob";
    const mimeType = reference.mimeType ?? MIME_FALLBACKS[type] ?? "blob";

    await objectStore.deleteObject(reference).catch(() => {});

    return this.createSuccessResult(
      { [name]: { data: stored.data, mimeType } },
      GATEWAY_USAGE
    );
  }

  /**
   * Fetch a file the model returned by reference, as the bytes a blob output
   * is made of.
   *
   * Every failure here is raised rather than swallowed. The alternative was
   * what this method was written to fix: a link assigned to a blob output is
   * rejected by the runtime's converter and vanishes, so the run goes green
   * with nothing in it and there is nowhere to look.
   */
  private async downloadBlobOutput(
    url: string,
    type: string
  ): Promise<{ data: Uint8Array; mimeType: string }> {
    const response = await fetch(url);
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        `The model returned a link the runtime could not download (${response.status})`
      );
    }

    const tooLarge = (bytes: number) =>
      new Error(
        `The generated file is ${Math.round(bytes / (1024 * 1024))}MB, over the ${
          MAX_DOWNLOAD_BYTES / (1024 * 1024)
        }MB this node can hold`
      );

    // Checked before reading when the header is there, and again afterwards
    // because a chunked response does not declare a length.
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
      await response.body?.cancel();
      throw tooLarge(declared);
    }

    const data = new Uint8Array(await response.arrayBuffer());
    if (data.byteLength > MAX_DOWNLOAD_BYTES) throw tooLarge(data.byteLength);

    return {
      data,
      mimeType:
        response.headers.get("content-type")?.split(";")[0]?.trim() ||
        MIME_FALLBACKS[type] ||
        MIME_FALLBACKS.blob,
    };
  }

  /**
   * One output value, with a returned link turned into the file it points at.
   *
   * Only for blob-typed outputs: a link on a `string` output is the answer
   * the model was asked for, and downloading it would replace a URL somebody
   * wanted with bytes they did not.
   */
  private async resolveOutputValue(
    value: unknown,
    type: string
  ): Promise<ParameterValue> {
    if (!BLOB_TYPES.has(type)) return value as ParameterValue;
    const url = asDownloadUrl(value);
    if (!url) return value as ParameterValue;
    return (await this.downloadBlobOutput(url, type)) as ParameterValue;
  }

  /** Distribute an inline (non-upload) model response onto the named outputs. */
  private async processInlineOutput(result: unknown): Promise<NodeExecution> {
    const outputs = this.node.outputs ?? [];

    if (
      result !== null &&
      typeof result === "object" &&
      !Array.isArray(result)
    ) {
      const obj = result as Record<string, unknown>;
      const payload: Record<string, ParameterValue> = {};
      for (const outputDef of outputs) {
        const value = obj[outputDef.name];
        if (value !== undefined && value !== null) {
          payload[outputDef.name] = await this.resolveOutputValue(
            value,
            outputDef.type
          );
        }
      }
      if (Object.keys(payload).length > 0) {
        return this.createSuccessResult(payload, GATEWAY_USAGE);
      }
      return this.createSuccessResult(
        { [outputs[0]?.name ?? "output"]: obj as ParameterValue },
        GATEWAY_USAGE
      );
    }

    // A bare value, which for a file-output model is the link itself.
    const only = outputs[0];
    return this.createSuccessResult(
      {
        [only?.name ?? "output"]: only
          ? await this.resolveOutputValue(result, only.type)
          : (result as ParameterValue),
      },
      GATEWAY_USAGE
    );
  }
}
