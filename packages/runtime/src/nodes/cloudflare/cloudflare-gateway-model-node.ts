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
    subscription: true,
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

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
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
          payload[outputDef.name] = value as ParameterValue;
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

    return this.createSuccessResult(
      { [outputs[0]?.name ?? "output"]: result as ParameterValue },
      GATEWAY_USAGE
    );
  }
}
