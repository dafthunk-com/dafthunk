import {
  type BlobParameter,
  MultiStepNode,
  type MultiStepNodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Response shape from Replicate predictions API
 */
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | Record<string, unknown>;
  error?: string;
}

const BLOB_TYPES = new Set(["image", "audio", "video", "blob"]);

/**
 * Detect MIME type from a URL's content-type header or file extension.
 */
function guessMimeType(contentType: string | null, outputType: string): string {
  if (contentType) return contentType;
  const fallbacks: Record<string, string> = {
    image: "image/png",
    audio: "audio/mpeg",
    video: "video/mp4",
    blob: "application/octet-stream",
  };
  return fallbacks[outputType] ?? "application/octet-stream";
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
      },
    ],
    outputs: [],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

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

      // Parse model identifier: "owner/name" or "owner/name:version"
      const [ownerName, explicitVersion] = modelInput.split(":");
      const modelPath = ownerName.trim();

      // Build input payload from all non-model inputs
      const input: Record<string, string | number | boolean> = {};

      for (const [key, value] of Object.entries(context.inputs)) {
        if (key === "model" || value === undefined || value === null) continue;

        // Check if this input is a blob type by looking at the node's input definition
        const paramDef = this.node.inputs?.find((p) => p.name === key);
        const isBlobType = paramDef && BLOB_TYPES.has(paramDef.type);

        if (isBlobType && typeof value === "object" && "data" in value) {
          // Upload blob to get a presigned URL
          if (!context.objectStore) {
            return this.createErrorResult(
              `ObjectStore not available (required for ${key} input)`
            );
          }
          const blob = value as BlobParameter;
          input[key] = await context.objectStore.writeAndPresign(
            blob.data,
            blob.mimeType,
            context.organizationId
          );
        } else {
          input[key] = value as string | number | boolean;
        }
      }

      // Build prediction URL
      const predictionUrl = explicitVersion
        ? "https://api.replicate.com/v1/predictions"
        : `https://api.replicate.com/v1/models/${modelPath}/predictions`;

      const body = explicitVersion
        ? { version: explicitVersion, input }
        : { input };

      // Create prediction (durable step)
      const prediction = await doStep(async () => {
        const response = await fetch(predictionUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to create Replicate prediction: ${response.status} ${errorText}`
          );
        }

        return (await response.json()) as ReplicatePrediction;
      });

      // Poll with durable sleep (max 60 polls × 10s = 10 minutes)
      const maxPolls = 60;
      let result = prediction;
      for (
        let i = 0;
        i < maxPolls &&
        result.status !== "succeeded" &&
        result.status !== "failed" &&
        result.status !== "canceled";
        i++
      ) {
        await sleep(10_000);

        result = await doStep(async () => {
          const response = await fetch(
            `https://api.replicate.com/v1/predictions/${prediction.id}`,
            {
              headers: {
                Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Failed to poll prediction status: ${response.status} ${errorText}`
            );
          }

          return (await response.json()) as ReplicatePrediction;
        });
      }

      if (result.status === "failed") {
        return this.createErrorResult(
          `Replicate prediction failed: ${result.error || "Unknown error"}`
        );
      }

      if (result.status === "canceled") {
        return this.createErrorResult("Replicate prediction was canceled");
      }

      if (result.status !== "succeeded") {
        return this.createErrorResult(
          "Replicate prediction timed out after 10 minutes"
        );
      }

      if (result.output === undefined || result.output === null) {
        return this.createErrorResult(
          "Replicate prediction succeeded but no output was returned"
        );
      }

      // Determine expected output type from node definition
      const outputType = this.node.outputs?.[0]?.type ?? "any";

      // Process output based on type
      return await this.processOutput(result.output, outputType);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  private async processOutput(
    output: string | string[] | Record<string, unknown>,
    outputType: string
  ): Promise<NodeExecution> {
    // Extract the URL from array outputs (take first element)
    const outputUrl =
      typeof output === "string"
        ? output
        : Array.isArray(output) && output.length > 0
          ? output[0]
          : null;

    // If output type is a blob type and we have a URL, download it.
    // Replicate output URLs are temporary — we must download immediately.
    if (BLOB_TYPES.has(outputType) && typeof outputUrl === "string") {
      const response = await fetch(outputUrl);
      if (!response.ok) {
        throw new Error(`Failed to download output file: ${response.status}`);
      }
      const data = new Uint8Array(await response.arrayBuffer());
      const mimeType = guessMimeType(
        response.headers.get("content-type"),
        outputType
      );

      return this.createSuccessResult({ output: { data, mimeType } });
    }

    // String output
    if (typeof outputUrl === "string") {
      return this.createSuccessResult({ output: outputUrl });
    }

    // Object/JSON output
    return this.createSuccessResult({ output });
  }
}
