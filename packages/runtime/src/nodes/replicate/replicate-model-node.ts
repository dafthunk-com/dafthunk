import {
  isBlobParameter,
  MultiStepNode,
  type MultiStepNodeContext,
  toUint8Array,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

type ReplicateOutput =
  | string
  | string[]
  | Record<string, unknown>
  | Record<string, unknown>[];

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

/**
 * Download a Replicate output URL and return binary data with MIME type.
 * Output URLs are temporary, so we download immediately after prediction completes.
 */
async function downloadBlob(
  url: string,
  outputType: string,
  label: string
): Promise<{ data: Uint8Array; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${label}: ${response.status}`);
  }
  const contentType = response.headers.get("content-type");
  return {
    data: new Uint8Array(await response.arrayBuffer()),
    mimeType:
      contentType ?? MIME_FALLBACKS[outputType] ?? "application/octet-stream",
  };
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
      if (!modelInput || typeof modelInput !== "string") {
        return this.createErrorResult(
          "Model identifier is required (e.g., 'stability-ai/sdxl')"
        );
      }

      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      const [ownerName, version] = modelInput.split(":");
      const timeoutMinutes = Math.max(1, Number(context.inputs.timeout) || 30);
      const pollIntervalSec = Math.max(
        1,
        Number(context.inputs.poll_interval) || 10
      );

      const input = await this.buildInput(context);
      const { output, predictTime } = await this.runPrediction(
        context,
        ownerName.trim(),
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

  /**
   * Build the Replicate API input payload from context inputs.
   * Handles blob uploads (single and repeated) by presigning through the object store.
   */
  private async buildInput(
    context: MultiStepNodeContext
  ): Promise<Record<string, string | number | boolean | string[]>> {
    const input: Record<string, string | number | boolean | string[]> = {};

    for (const [key, value] of Object.entries(context.inputs)) {
      if (CONFIG_INPUTS.has(key) || value === undefined || value === null)
        continue;

      const paramDef = this.node.inputs?.find((p) => p.name === key);
      const isBlobType = paramDef && BLOB_TYPES.has(paramDef.type);

      if (isBlobType) {
        if (!context.objectStore) {
          throw new Error(
            "ObjectStore not available (required for blob inputs)"
          );
        }

        if (paramDef?.repeated && Array.isArray(value)) {
          const urls: string[] = [];
          for (const item of value) {
            if (isBlobParameter(item)) {
              urls.push(
                await context.objectStore.writeAndPresign(
                  toUint8Array(item.data),
                  item.mimeType,
                  context.organizationId
                )
              );
            }
          }
          input[key] = urls;
          continue;
        }

        if (isBlobParameter(value)) {
          const url = await context.objectStore.writeAndPresign(
            toUint8Array(value.data),
            value.mimeType,
            context.organizationId
          );
          input[key] = paramDef?.repeated ? [url] : url;
          continue;
        }
      }

      input[key] = value as string | number | boolean;
    }

    return input;
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

  /**
   * Convert Replicate output into a NodeExecution result.
   * Handles multi-output objects, blob downloads, strings, and JSON passthrough.
   */
  private async processOutput(
    output: ReplicateOutput,
    usage: number
  ): Promise<NodeExecution> {
    // Multi-output: object with keys matching named output definitions
    const multiResult = await this.tryProcessMultiOutput(output, usage);
    if (multiResult) return multiResult;

    // Single output: extract URL string if present
    const outputUrl =
      typeof output === "string"
        ? output
        : Array.isArray(output) &&
            output.length > 0 &&
            typeof output[0] === "string"
          ? output[0]
          : null;

    const outputType = this.node.outputs?.[0]?.type ?? "any";

    // Blob output — download immediately (Replicate URLs are temporary)
    if (BLOB_TYPES.has(outputType) && outputUrl) {
      const blob = await downloadBlob(outputUrl, outputType, "output");
      return this.createSuccessResult({ output: blob }, usage);
    }

    if (outputUrl) {
      return this.createSuccessResult({ output: outputUrl }, usage);
    }

    return this.createSuccessResult({ output }, usage);
  }

  /**
   * Try to interpret output as a multi-output object where each key maps to a
   * named blob output definition. Returns null if the node has <= 1 output or
   * no blob outputs were found in the object.
   */
  private async tryProcessMultiOutput(
    output: ReplicateOutput,
    usage: number
  ): Promise<NodeExecution | null> {
    if ((this.node.outputs?.length ?? 0) <= 1) return null;

    // Extract the object: either directly or unwrap first array element
    const obj =
      typeof output === "object" && !Array.isArray(output)
        ? output
        : Array.isArray(output) &&
            output.length > 0 &&
            typeof output[0] === "object" &&
            output[0] !== null
          ? (output[0] as Record<string, unknown>)
          : null;

    if (!obj) return null;

    const results: Record<string, { data: Uint8Array; mimeType: string }> = {};
    for (const outputDef of this.node.outputs ?? []) {
      const value = obj[outputDef.name];
      if (!BLOB_TYPES.has(outputDef.type) || typeof value !== "string")
        continue;
      results[outputDef.name] = await downloadBlob(
        value,
        outputDef.type,
        outputDef.name
      );
    }

    return Object.keys(results).length > 0
      ? this.createSuccessResult(results, usage)
      : null;
  }
}
