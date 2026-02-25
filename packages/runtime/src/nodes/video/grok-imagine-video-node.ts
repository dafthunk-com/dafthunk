import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
  type VideoParameter,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

// https://replicate.com/xai/grok-imagine-video — $0.05 per second of output video
// 1000 credits = $1
const COST_PER_SECOND = 0.05;

/**
 * Response shape from Replicate predictions API
 */
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string;
  error?: string;
}

const ASPECT_RATIO_OPTIONS = [
  "16:9",
  "4:3",
  "1:1",
  "9:16",
  "3:4",
  "3:2",
  "2:3",
] as const;

const RESOLUTION_OPTIONS = ["720p", "480p"] as const;

const blobSchema = z
  .object({
    data: z.instanceof(Uint8Array),
    mimeType: z.string(),
  })
  .optional();

/**
 * Grok Imagine Video node for generating videos from text, images, or video
 * using xAI's Grok Imagine Video model via Replicate.
 * Supports text-to-video, image-to-video, and video-to-video generation.
 * @see https://replicate.com/xai/grok-imagine-video
 */
export class GrokImagineVideoNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    prompt: z.string().min(1),
    image: blobSchema,
    video: blobSchema,
    duration: z.coerce.number().int().min(1).max(15).optional().default(5),
    aspect_ratio: z.enum(ASPECT_RATIO_OPTIONS).optional().default("16:9"),
    resolution: z.enum(RESOLUTION_OPTIONS).optional().default("720p"),
  });

  public static readonly nodeType: NodeType = {
    id: "grok-imagine-video",
    name: "Video Generation (Grok Imagine)",
    type: "grok-imagine-video",
    description:
      "Generates videos from text, images, or video using xAI's Grok Imagine Video model via Replicate",
    tags: [
      "AI",
      "Video",
      "Replicate",
      "Generate",
      "Text-to-Video",
      "xAI",
      "Grok",
    ],
    icon: "video",
    documentation:
      "This node generates videos using the xAI Grok Imagine Video model via Replicate. Supports text-to-video, image-to-video, and video-to-video generation with configurable duration (1-15 seconds), aspect ratio, and resolution.",
    referenceUrl: "https://replicate.com/xai/grok-imagine-video",
    inlinable: false,
    usage: 250, // Default: 5s × 50 credits/s ($0.05/s, 1000 credits = $1)
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "Text prompt describing the video to generate",
        required: true,
      },
      {
        name: "image",
        type: "image",
        description: "Optional reference image for image-to-video generation",
      },
      {
        name: "video",
        type: "video",
        description: "Optional reference video for video-to-video generation",
      },
      {
        name: "duration",
        type: "number",
        description: "Video duration in seconds (1-15)",
        value: 5,
        hidden: true,
      },
      {
        name: "aspect_ratio",
        type: "string",
        description: "Aspect ratio (16:9, 4:3, 1:1, 9:16, 3:4, 3:2, or 2:3)",
        value: "16:9",
        hidden: true,
      },
      {
        name: "resolution",
        type: "string",
        description: "Output resolution (720p or 480p)",
        value: "720p",
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

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = GrokImagineVideoNode.inputSchema.parse(
        context.inputs
      );

      // Get Replicate API token from environment
      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      // Upload optional image/video inputs to get presigned URLs
      const input: Record<string, string | number> = {
        prompt: validatedInput.prompt,
        duration: validatedInput.duration,
        aspect_ratio: validatedInput.aspect_ratio,
        resolution: validatedInput.resolution,
      };

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

      if (validatedInput.video) {
        if (!context.objectStore) {
          return this.createErrorResult(
            "ObjectStore not available in context (required for video input)"
          );
        }
        const videoBlob = validatedInput.video as VideoParameter;
        input.video = await context.objectStore.writeAndPresign(
          videoBlob.data,
          videoBlob.mimeType,
          context.organizationId
        );
      }

      // Create prediction with sync mode (waits up to 60s)
      const syncTimeout = 60;
      const maxWaitTime = 600000; // 10 minutes total
      const pollDelay = 10000; // 10 seconds between polls
      const startTime = Date.now();

      console.log("GrokImagineVideoNode: Creating prediction");

      const createResponse = await fetch(
        "https://api.replicate.com/v1/models/xai/grok-imagine-video/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
          body: JSON.stringify({ input }),
        }
      );

      console.log(
        "GrokImagineVideoNode: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(
          "GrokImagineVideoNode: Create prediction failed:",
          errorText
        );
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "GrokImagineVideoNode: Initial prediction:",
        JSON.stringify({
          id: prediction.id,
          status: prediction.status,
        })
      );

      // Poll until completion or timeout
      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed" &&
        prediction.status !== "canceled" &&
        Date.now() - startTime < maxWaitTime
      ) {
        if (context.onProgress) {
          const elapsed = Date.now() - startTime;
          context.onProgress(Math.min(0.9, elapsed / maxWaitTime));
        }

        // Wait before polling
        await new Promise((resolve) => setTimeout(resolve, pollDelay));

        // Poll Replicate API for prediction status
        const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;
        console.log("GrokImagineVideoNode: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "GrokImagineVideoNode: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("GrokImagineVideoNode: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "GrokImagineVideoNode: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Grok Imagine Video generation failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult(
          "Grok Imagine Video generation was canceled"
        );
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Grok Imagine Video generation timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Grok Imagine Video generation succeeded but no output was returned"
        );
      }

      // Download the video file
      const videoResponse = await fetch(prediction.output);
      if (!videoResponse.ok) {
        return this.createErrorResult(
          `Failed to download video file: ${videoResponse.status}`
        );
      }
      const videoData = new Uint8Array(await videoResponse.arrayBuffer());

      // Determine mime type from response or default to mp4
      const contentType =
        videoResponse.headers.get("content-type") || "video/mp4";

      const usage = Math.max(
        1,
        Math.round(validatedInput.duration * COST_PER_SECOND * 1000)
      );

      return this.createSuccessResult(
        {
          video: {
            data: videoData,
            mimeType: contentType,
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
