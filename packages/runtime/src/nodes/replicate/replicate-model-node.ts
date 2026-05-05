import {
  isBlobParameter,
  MultiStepNode,
  type MultiStepNodeContext,
  type ParameterValue,
  toUint8Array,
} from "@dafthunk/runtime";
import {
  type NodeExecution,
  type NodeType,
  replicateOwnerName,
} from "@dafthunk/types";

type ReplicateOutput =
  | string
  | number
  | boolean
  | null
  | string[]
  | Record<string, unknown>
  | Record<string, unknown>[]
  | unknown[];

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: ReplicateOutput;
  error?: string;
  metrics?: {
    predict_time?: number;
  };
}

const BLOB_TYPES = new Set(["image", "audio", "video", "blob"]);
const REPLICATE_CREDITS_PER_SEC = 10;

// Node config inputs that should not be forwarded to the Replicate API
const CONFIG_INPUTS = new Set(["model", "timeout", "poll_interval"]);

const MIME_FALLBACKS: Record<string, string> = {
  image: "image/png",
  audio: "audio/mpeg",
  video: "video/mp4",
  blob: "application/octet-stream",
};

// Replicate output URLs are temporary, so blobs are downloaded immediately
// after prediction completes.
async function downloadBlob(
  url: string,
  outputType: string,
  label: string
): Promise<{ data: Uint8Array; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${label} (${response.status} ${response.statusText})`
    );
  }
  const contentType = response.headers.get("content-type");
  return {
    data: new Uint8Array(await response.arrayBuffer()),
    mimeType:
      contentType ?? MIME_FALLBACKS[outputType] ?? "application/octet-stream",
  };
}

// Some models wrap their object output inside a single-element array.
function extractOutputObject(
  output: ReplicateOutput
): Record<string, unknown> | null {
  const candidate = Array.isArray(output) ? output[0] : output;
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    return candidate as Record<string, unknown>;
  }
  return null;
}

function extractOutputUrl(output: ReplicateOutput): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  return null;
}

/**
 * Generic Replicate model node that executes any model based on
 * schema-derived inputs/outputs. The `model` input is the only static
 * parameter; all others are added dynamically by the frontend widget
 * when the user loads a model schema.
 *
 * @see https://replicate.com/docs/reference/http
 */
export class ReplicateModelNode extends MultiStepNode {
  public static readonly nodeType: NodeType = {
    id: "replicate-model",
    name: "Replicate Model",
    type: "replicate-model",
    description:
      "Run any model from the Replicate collection. Enter a model identifier, load its schema, and the node's inputs and outputs adapt automatically.",
    documentation: `Run any of the thousands of models available on [Replicate](https://replicate.com/explore).

### How to use

1. Browse the [Replicate model collection](https://replicate.com/explore) and find a model
2. Copy its identifier (shown at the top of the model page)
3. Paste it into this node and click **Load**
4. The node's inputs and outputs update to match the model's parameters

### Model identifier format

- \`provider/model\` — uses the latest version
- \`provider/model:version\` — pins a specific version

For example: \`google/veo-3\`, \`openai/whisper\`, \`xai/grok-imagine-video\`.`,
    referenceUrl: "https://replicate.com/explore",
    tags: ["AI", "Replicate", "Generic"],
    icon: "bot",
    inlinable: false,
    usage: 100,
    subscription: true,
    inputs: [
      {
        name: "model",
        type: "string",
        description:
          "Replicate model identifier in the format provider/model or provider/model:version",
        required: true,
        hidden: true,
      },
      {
        name: "timeout",
        type: "number",
        description:
          "Maximum time to wait for prediction to complete (minutes)",
        default: 30,
        minimum: 1,
        maximum: 120,
        hidden: true,
      },
      {
        name: "poll_interval",
        type: "number",
        description: "Time between status checks (seconds)",
        default: 10,
        minimum: 1,
        maximum: 60,
        hidden: true,
      },
    ],
    outputs: [],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    try {
      const modelInput = context.inputs.model;
      if (typeof modelInput !== "string" || !modelInput.trim()) {
        return this.createErrorResult(
          "Model identifier is required (e.g., 'stability-ai/sdxl')"
        );
      }

      const trimmedModel = modelInput.trim();
      const ownerName = replicateOwnerName(trimmedModel).trim();
      const [, rawVersion] = trimmedModel.split(":", 2);
      const version = rawVersion?.trim() || undefined;

      if (!/^[^/\s]+\/[^/\s]+$/.test(ownerName)) {
        return this.createErrorResult(
          `Invalid model identifier "${trimmedModel}" — expected provider/model or provider/model:version`
        );
      }

      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      const timeoutMinutes = Math.max(1, Number(context.inputs.timeout) || 30);
      const pollIntervalSec = Math.max(
        1,
        Number(context.inputs.poll_interval) || 10
      );

      const input = await this.buildInput(context);
      const { output, predictTime } = await this.runPrediction(
        context,
        ownerName,
        version,
        REPLICATE_API_TOKEN,
        input,
        timeoutMinutes,
        pollIntervalSec
      );

      const usage =
        predictTime !== undefined && predictTime > 0
          ? Math.max(1, Math.round(predictTime * REPLICATE_CREDITS_PER_SEC))
          : 1;

      return await this.processOutput(output, usage);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  // String URLs pass through unchanged so values can be chained from upstream
  // nodes that emit URLs directly (rather than blob parameters).
  private async buildInput(
    context: MultiStepNodeContext
  ): Promise<Record<string, string | number | boolean | string[]>> {
    const paramByName = new Map(
      (this.node.inputs ?? []).map((p) => [p.name, p])
    );

    const entries = await Promise.all(
      Object.entries(context.inputs)
        .filter(
          ([key, value]) =>
            !CONFIG_INPUTS.has(key) && value !== undefined && value !== null
        )
        .map(async ([key, value]) => {
          const paramDef = paramByName.get(key);
          if (paramDef && BLOB_TYPES.has(paramDef.type)) {
            const presigned = await this.presignBlobInput(
              context,
              key,
              value,
              paramDef.repeated ?? false
            );
            if (presigned !== undefined) return [key, presigned] as const;
          }
          return [key, value as string | number | boolean] as const;
        })
    );

    return Object.fromEntries(entries);
  }

  // Accepts blob parameters, string URLs, and arrays mixing both. Returns
  // undefined to fall through to the generic value passthrough.
  private async presignBlobInput(
    context: MultiStepNodeContext,
    key: string,
    value: unknown,
    repeated: boolean
  ): Promise<string | string[] | undefined> {
    const presignBlob = (blob: { data: unknown; mimeType: string }) => {
      if (!context.objectStore) {
        throw new Error(
          `ObjectStore not available (required for blob input "${key}")`
        );
      }
      return context.objectStore.writeAndPresign(
        toUint8Array(blob.data as Uint8Array | Record<string, number>),
        blob.mimeType,
        context.organizationId
      );
    };

    if (Array.isArray(value)) {
      const pending: Array<string | Promise<string>> = [];
      for (const item of value) {
        if (isBlobParameter(item)) pending.push(presignBlob(item));
        else if (typeof item === "string" && item.length > 0)
          pending.push(item);
      }
      if (pending.length === 0) {
        throw new Error(
          `Input "${key}" is an array but contains no blob or URL values`
        );
      }
      return Promise.all(pending);
    }

    if (isBlobParameter(value)) {
      const url = await presignBlob(value);
      return repeated ? [url] : url;
    }

    if (typeof value === "string" && value.length > 0) {
      return repeated ? [value] : value;
    }

    return undefined;
  }

  /**
   * Create a prediction, poll until completion, and return the output.
   * Handles all Replicate API communication and terminal error states.
   */
  private async runPrediction(
    context: MultiStepNodeContext,
    modelPath: string,
    version: string | undefined,
    token: string,
    input: Record<string, string | number | boolean | string[]>,
    timeoutMinutes: number,
    pollIntervalSec: number
  ): Promise<{ output: ReplicateOutput; predictTime: number | undefined }> {
    const { sleep, doStep } = context;

    const predictionUrl = version
      ? "https://api.replicate.com/v1/predictions"
      : `https://api.replicate.com/v1/models/${modelPath}/predictions`;

    const body = version ? { version, input } : { input };

    const prediction = await doStep(async () => {
      const response = await fetch(predictionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Failed to create Replicate prediction: ${response.status} ${text}`
        );
      }
      return (await response.json()) as ReplicatePrediction;
    });

    const maxPolls = Math.ceil((timeoutMinutes * 60) / pollIntervalSec);
    const pollIntervalMs = pollIntervalSec * 1000;

    let result = prediction;
    for (
      let i = 0;
      i < maxPolls &&
      result.status !== "succeeded" &&
      result.status !== "failed" &&
      result.status !== "canceled";
      i++
    ) {
      await sleep(pollIntervalMs);

      result = await doStep(async () => {
        const response = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `Failed to poll prediction status: ${response.status} ${text}`
          );
        }
        return (await response.json()) as ReplicatePrediction;
      });
    }

    if (result.status === "failed") {
      throw new Error(
        `Replicate prediction failed: ${result.error || "Unknown error"}`
      );
    }
    if (result.status === "canceled") {
      throw new Error("Replicate prediction was canceled");
    }
    if (result.status !== "succeeded") {
      throw new Error(
        `Replicate prediction timed out after ${timeoutMinutes} minutes`
      );
    }
    if (result.output === undefined || result.output === null) {
      throw new Error(
        "Replicate prediction succeeded but no output was returned"
      );
    }

    return { output: result.output, predictTime: result.metrics?.predict_time };
  }

  private async processOutput(
    output: ReplicateOutput,
    usage: number
  ): Promise<NodeExecution> {
    const multiResult = await this.tryProcessMultiOutput(output, usage);
    if (multiResult) return multiResult;

    // Use the first declared output name so wires keep working when the schema
    // declared more outputs than Replicate actually returned.
    const declaredOutputs = this.node.outputs ?? [];
    const primaryName = declaredOutputs[0]?.name ?? "output";
    const primaryType = declaredOutputs[0]?.type ?? "any";
    const outputUrl = extractOutputUrl(output);

    if (BLOB_TYPES.has(primaryType) && outputUrl) {
      const blob = await downloadBlob(outputUrl, primaryType, primaryName);
      return this.createSuccessResult({ [primaryName]: blob }, usage);
    }

    if (outputUrl) {
      return this.createSuccessResult({ [primaryName]: outputUrl }, usage);
    }

    return this.createSuccessResult(
      { [primaryName]: output as ParameterValue },
      usage
    );
  }

  // Returns null when the node has <= 1 declared output, the output isn't
  // object-shaped, or no declared output keys matched — caller falls back to
  // single-output handling.
  private async tryProcessMultiOutput(
    output: ReplicateOutput,
    usage: number
  ): Promise<NodeExecution | null> {
    if ((this.node.outputs?.length ?? 0) <= 1) return null;

    const obj = extractOutputObject(output);
    if (!obj) return null;

    const entries = await Promise.all(
      (this.node.outputs ?? []).map(
        async (
          outputDef
        ): Promise<readonly [string, ParameterValue] | null> => {
          const value = obj[outputDef.name];
          if (value === undefined || value === null) return null;

          if (BLOB_TYPES.has(outputDef.type)) {
            if (typeof value !== "string") return null;
            return [
              outputDef.name,
              await downloadBlob(value, outputDef.type, outputDef.name),
            ];
          }
          return [outputDef.name, value as ParameterValue];
        }
      )
    );

    const results = Object.fromEntries(
      entries.filter((e): e is readonly [string, ParameterValue] => e !== null)
    );

    return Object.keys(results).length > 0
      ? this.createSuccessResult(results, usage)
      : null;
  }
}
