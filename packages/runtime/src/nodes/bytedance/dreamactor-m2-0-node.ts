import type {
  ImageParameter,
  MultiStepNodeContext,
  VideoParameter,
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

const blobSchema = z.object({
  data: z.instanceof(Uint8Array),
  mimeType: z.string(),
});

/**
 * DreamActor M2.0 node for animating a portrait image using a template video's
 * motion, facial expressions, and lip movements via Replicate.
 * @see https://replicate.com/bytedance/dreamactor-m2.0
 */
export class DreamActorM20Node extends MultiStepNode {
  private static readonly inputSchema = z.object({
    image: blobSchema,
    video: blobSchema,
    cut_first_second: z.boolean().optional().default(true),
  });

  public static readonly nodeType: NodeType = {
    id: "dreamactor-m2-0",
    name: "Video Reenactment (DreamActor M2.0)",
    type: "dreamactor-m2-0",
    description:
      "Animates a portrait image by transferring motion, facial expressions, and lip movements from a template video using ByteDance's DreamActor M2.0 via Replicate",
    tags: [
      "AI",
      "Video",
      "Replicate",
      "ByteDance",
      "Reenactment",
      "Animation",
      "DreamActor",
    ],
    icon: "video",
    documentation:
      "Generates a reenactment video by transferring the motion, facial expressions, and lip movements from a template video onto a portrait image subject. The image must be JPEG/JPG/PNG (max 4.7 MB, 480×480 to 1920×1080). The template video must be MP4/MOV/WebM (max 30 seconds, 200×200 to 2048×1440). Set cut_first_second to true to remove the 1-second transition at the start of the output.",
    referenceUrl: "https://replicate.com/bytedance/dreamactor-m2.0",
    inlinable: false,
    usage: 500,
    inputs: [
      {
        name: "image",
        type: "image",
        description:
          "Input image of a human subject. Supported formats: JPEG, JPG, PNG. Max size: 4.7 MB. Resolution: 480×480 to 1920×1080.",
        required: true,
      },
      {
        name: "video",
        type: "video",
        description:
          "Template video whose motion, facial expressions, and lip movements will be applied to the image subject. Supported formats: MP4, MOV, WebM. Max duration: 30 seconds. Resolution: 200×200 to 2048×1440.",
        required: true,
      },
      {
        name: "cut_first_second",
        type: "boolean",
        description:
          "Whether to crop the first second of the output video (removes the 1-second transition at the beginning).",
        value: true,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "video",
        type: "video",
        description: "Generated reenactment video",
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = DreamActorM20Node.inputSchema.parse(
        context.inputs
      );

      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      if (!context.objectStore) {
        return this.createErrorResult(
          "ObjectStore not available in context (required for image and video inputs)"
        );
      }

      const imageBlob = validatedInput.image as ImageParameter;
      const imageUrl = await context.objectStore.writeAndPresign(
        imageBlob.data,
        imageBlob.mimeType,
        context.organizationId
      );

      const videoBlob = validatedInput.video as VideoParameter;
      const videoUrl = await context.objectStore.writeAndPresign(
        videoBlob.data,
        videoBlob.mimeType,
        context.organizationId
      );

      const input: Record<string, string | boolean> = {
        image: imageUrl,
        video: videoUrl,
        cut_first_second: validatedInput.cut_first_second,
      };

      // Create prediction (durable step — cached on replay)
      const prediction = await doStep(async () => {
        const response = await fetch(
          "https://api.replicate.com/v1/models/bytedance/dreamactor-m2.0/predictions",
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
          `DreamActor M2.0 generation failed: ${result.error ?? "Unknown error"}`
        );
      }

      if (result.status === "canceled") {
        return this.createErrorResult("DreamActor M2.0 generation was canceled");
      }

      if (result.status !== "succeeded") {
        return this.createErrorResult(
          "DreamActor M2.0 generation timed out after 10 minutes"
        );
      }

      if (!result.output) {
        return this.createErrorResult(
          "DreamActor M2.0 generation succeeded but no output was returned"
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
