import type {
  AudioParameter,
  ImageParameter,
  MultiStepNodeContext,
} from "@dafthunk/runtime";
import { MultiStepNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

/**
 * Response shape from Replicate predictions API
 */
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string;
  error?: string;
}

/**
 * OmniHuman 1.5 node for generating talking-head videos from a portrait image
 * and an audio file using ByteDance's OmniHuman 1.5 model via Replicate.
 * @see https://replicate.com/bytedance/omni-human-1.5
 */
export class OmniHuman15Node extends MultiStepNode {
  private static readonly inputSchema = z.object({
    image: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
    audio: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
    prompt: z.string().optional(),
    fast_mode: z.boolean().optional().default(false),
    seed: z.number().int().optional(),
  });

  public static readonly nodeType: NodeType = {
    id: "omni-human-1-5",
    name: "Video Generation (OmniHuman 1.5)",
    type: "omni-human-1-5",
    description:
      "Generates talking-head videos by animating a portrait image with an audio file using ByteDance's OmniHuman 1.5 model via Replicate",
    tags: [
      "AI",
      "Video",
      "Replicate",
      "ByteDance",
      "OmniHuman",
      "Animation",
      "Audio-Driven",
    ],
    icon: "video",
    documentation:
      "Generates a video by animating a human subject, face, or character image with an input audio file. The audio must be MP3, WAV, or similar and under 35 seconds. An optional prompt can provide precise control over the scene, movements, and camera. Supports Chinese, English, Japanese, Korean, Spanish, and Indonesian in the prompt. Enable fast_mode for quicker generation at the cost of some visual quality.",
    referenceUrl: "https://replicate.com/bytedance/omni-human-1.5",
    inlinable: false,
    usage: 500,
    inputs: [
      {
        name: "image",
        type: "image",
        description:
          "Input image containing a human subject, face, or character.",
        required: true,
      },
      {
        name: "audio",
        type: "audio",
        description:
          "Input audio file (MP3, WAV, etc.). Duration must be less than 35 seconds.",
        required: true,
      },
      {
        name: "prompt",
        type: "string",
        description:
          "Optional prompt for precise control of the scene, movements, and camera. Supports Chinese, English, Japanese, Korean, Spanish, and Indonesian.",
      },
      {
        name: "fast_mode",
        type: "boolean",
        description:
          "Enable fast mode to speed up generation by sacrificing some visual quality.",
        value: false,
        hidden: true,
      },
      {
        name: "seed",
        type: "number",
        description: "Random seed for reproducible generation.",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "video",
        type: "video",
        description: "Generated talking-head video",
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = OmniHuman15Node.inputSchema.parse(context.inputs);

      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      if (!context.objectStore) {
        return this.createErrorResult(
          "ObjectStore not available in context (required for image and audio inputs)"
        );
      }

      const imageBlob = validatedInput.image as ImageParameter;
      const imageUrl = await context.objectStore.writeAndPresign(
        imageBlob.data,
        imageBlob.mimeType,
        context.organizationId
      );

      const audioBlob = validatedInput.audio as AudioParameter;
      const audioUrl = await context.objectStore.writeAndPresign(
        audioBlob.data,
        audioBlob.mimeType,
        context.organizationId
      );

      const input: Record<string, string | boolean | number> = {
        image: imageUrl,
        audio: audioUrl,
        fast_mode: validatedInput.fast_mode,
      };

      if (validatedInput.prompt) {
        input.prompt = validatedInput.prompt;
      }

      if (validatedInput.seed !== undefined) {
        input.seed = validatedInput.seed;
      }

      // Create prediction (durable step — cached on replay)
      const prediction = await doStep(async () => {
        const response = await fetch(
          "https://api.replicate.com/v1/models/bytedance/omni-human-1.5/predictions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ input }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to create Replicate prediction: ${response.status} ${errorText}`
          );
        }

        return (await response.json()) as ReplicatePrediction;
      });

      // Poll with durable sleep (zero compute cost between polls)
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
          `OmniHuman 1.5 generation failed: ${result.error ?? "Unknown error"}`
        );
      }

      if (result.status === "canceled") {
        return this.createErrorResult("OmniHuman 1.5 generation was canceled");
      }

      if (result.status !== "succeeded") {
        return this.createErrorResult(
          "OmniHuman 1.5 generation timed out after 10 minutes"
        );
      }

      if (!result.output) {
        return this.createErrorResult(
          "OmniHuman 1.5 generation succeeded but no output was returned"
        );
      }

      // Download the video file (outside doStep — binary data is too large
      // for SQLite persistence; re-downloading on replay is fine)
      const videoResponse = await fetch(result.output);
      if (!videoResponse.ok) {
        throw new Error(
          `Failed to download video file: ${videoResponse.status}`
        );
      }
      const videoData = new Uint8Array(await videoResponse.arrayBuffer());
      const videoMimeType =
        videoResponse.headers.get("content-type") ?? "video/mp4";

      return this.createSuccessResult({
        video: {
          data: videoData,
          mimeType: videoMimeType,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        return this.createErrorResult(`Validation error: ${errorMessages}`);
      }

      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
