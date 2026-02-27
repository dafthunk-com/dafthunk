import {
  type ImageParameter,
  MultiStepNode,
  type MultiStepNodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

// https://replicate.com/google/veo-3.1-fast — ~$0.08 per second of output video
// 1000 credits = $1
const COST_PER_SECOND = 0.08;

/**
 * Response shape from Replicate predictions API
 */
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string;
  error?: string;
}

const ASPECT_RATIO_OPTIONS = ["16:9", "9:16"] as const;
const RESOLUTION_OPTIONS = ["720p", "1080p"] as const;
const DURATION_OPTIONS = [4, 6, 8] as const;

const blobSchema = z
  .object({
    data: z.instanceof(Uint8Array),
    mimeType: z.string(),
  })
  .optional();

/**
 * Veo 3.1 Fast video generation node using the Replicate API.
 * Higher-fidelity fast version of Veo 3 with context-aware audio and last frame support.
 *
 * @see https://replicate.com/google/veo-3.1-fast
 */
export class Veo31FastNode extends MultiStepNode {
  private static readonly inputSchema = z.object({
    prompt: z.string().min(1),
    image: blobSchema,
    last_frame: blobSchema,
    reference_image_1: blobSchema,
    reference_image_2: blobSchema,
    reference_image_3: blobSchema,
    negative_prompt: z.string().optional(),
    aspect_ratio: z.enum(ASPECT_RATIO_OPTIONS).optional().default("16:9"),
    resolution: z.enum(RESOLUTION_OPTIONS).optional().default("720p"),
    duration: z.coerce
      .number()
      .int()
      .refine(
        (v) =>
          DURATION_OPTIONS.includes(v as (typeof DURATION_OPTIONS)[number]),
        {
          message: "Duration must be 4, 6, or 8",
        }
      )
      .optional()
      .default(8),
    generate_audio: z.boolean().optional().default(true),
  });

  public static readonly nodeType: NodeType = {
    id: "veo-3-1-fast",
    name: "Video Generation (Veo 3.1 Fast)",
    type: "veo-3-1-fast",
    description:
      "Generates high-fidelity videos with context-aware audio from text prompts or images using Google's Veo 3.1 Fast model via Replicate",
    tags: [
      "AI",
      "Video",
      "Replicate",
      "Google",
      "Generate",
      "Text-to-Video",
      "Veo",
    ],
    icon: "video",
    documentation:
      "This node generates videos using Google's Veo 3.1 Fast model via Replicate. An improved fast variant of Veo 3 with higher-fidelity video, context-aware audio, and last frame support. Supports text-to-video, image-to-video, frame-to-frame, and reference-image generation with configurable duration (4, 6, or 8 seconds), aspect ratio, and resolution.",
    referenceUrl: "https://replicate.com/google/veo-3.1-fast",
    inlinable: false,
    usage: 640, // Default: 8s × 80 credits/s ($0.08/s, 1000 credits = $1)
    inputs: [
      {
        name: "prompt",
        type: "string",
        description:
          "Text prompt describing the video to generate. Can include dialogue and sound cues for context-aware audio generation.",
        required: true,
      },
      {
        name: "image",
        type: "image",
        description:
          "Optional input image used as the first frame for image-to-video generation",
      },
      {
        name: "last_frame",
        type: "image",
        description:
          "Optional last frame image for frame-to-frame generation (requires image input as first frame)",
      },
      {
        name: "reference_image_1",
        type: "image",
        description:
          "Optional reference image to guide appearance and style consistency",
      },
      {
        name: "reference_image_2",
        type: "image",
        description: "Optional second reference image",
      },
      {
        name: "reference_image_3",
        type: "image",
        description: "Optional third reference image",
      },
      {
        name: "negative_prompt",
        type: "string",
        description: "What to exclude from the generated video",
        hidden: true,
      },
      {
        name: "aspect_ratio",
        type: "string",
        description: "Aspect ratio: 16:9 (landscape) or 9:16 (portrait)",
        value: "16:9",
        hidden: true,
      },
      {
        name: "resolution",
        type: "string",
        description: "Output resolution (720p or 1080p)",
        value: "720p",
        hidden: true,
      },
      {
        name: "duration",
        type: "number",
        description: "Video duration in seconds (4, 6, or 8)",
        value: 8,
        hidden: true,
      },
      {
        name: "generate_audio",
        type: "boolean",
        description: "Whether to generate context-aware audio with the video",
        value: true,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "video",
        type: "video",
        description: "Generated video",
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = Veo31FastNode.inputSchema.parse(context.inputs);

      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      const input: Record<string, string | number | boolean | string[]> = {
        prompt: validatedInput.prompt,
        duration: validatedInput.duration,
        aspect_ratio: validatedInput.aspect_ratio,
        resolution: validatedInput.resolution,
        generate_audio: validatedInput.generate_audio,
      };

      if (validatedInput.negative_prompt) {
        input.negative_prompt = validatedInput.negative_prompt;
      }

      if (validatedInput.image) {
        if (!context.objectStore) {
          return this.createErrorResult(
            "ObjectStore not available in context (required for image input)"
          );
        }
        const imageBlob = validatedInput.image as ImageParameter;
        input.image = await context.objectStore.writeAndPresign(
          imageBlob.data,
          imageBlob.mimeType,
          context.organizationId
        );
      }

      if (validatedInput.last_frame) {
        if (!context.objectStore) {
          return this.createErrorResult(
            "ObjectStore not available in context (required for last_frame input)"
          );
        }
        const lastFrameBlob = validatedInput.last_frame as ImageParameter;
        input.last_frame = await context.objectStore.writeAndPresign(
          lastFrameBlob.data,
          lastFrameBlob.mimeType,
          context.organizationId
        );
      }

      const referenceImages: string[] = [];
      for (const key of [
        "reference_image_1",
        "reference_image_2",
        "reference_image_3",
      ] as const) {
        const refImage = validatedInput[key];
        if (refImage) {
          if (!context.objectStore) {
            return this.createErrorResult(
              `ObjectStore not available in context (required for ${key} input)`
            );
          }
          const refBlob = refImage as ImageParameter;
          const url = await context.objectStore.writeAndPresign(
            refBlob.data,
            refBlob.mimeType,
            context.organizationId
          );
          referenceImages.push(url);
        }
      }
      if (referenceImages.length > 0) {
        input.reference_images = referenceImages;
      }

      // Create prediction (durable step — cached on replay)
      const prediction = await doStep(async () => {
        const response = await fetch(
          "https://api.replicate.com/v1/models/google/veo-3.1-fast/predictions",
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
          `Veo 3.1 Fast video generation failed: ${result.error ?? "Unknown error"}`
        );
      }

      if (result.status === "canceled") {
        return this.createErrorResult(
          "Veo 3.1 Fast video generation was canceled"
        );
      }

      if (result.status !== "succeeded") {
        return this.createErrorResult(
          "Veo 3.1 Fast video generation timed out after 10 minutes"
        );
      }

      if (!result.output) {
        return this.createErrorResult(
          "Veo 3.1 Fast video generation succeeded but no output was returned"
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

      const usage = Math.max(
        1,
        Math.round(validatedInput.duration * COST_PER_SECOND * 1000)
      );

      return this.createSuccessResult(
        {
          video: {
            data: videoData,
            mimeType: videoMimeType,
          },
        },
        usage
      );
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
