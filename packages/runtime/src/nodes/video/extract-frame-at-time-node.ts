import {
  MultiStepNode,
  type MultiStepNodeContext,
  type VideoParameter,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

interface ContainerJob {
  id: string;
  status: "processing" | "completed" | "failed";
  error?: string;
}

/**
 * Extracts a frame at a specific timestamp from a video as a JPEG image
 * using FFmpeg running in a Cloudflare Container.
 */
export class ExtractFrameAtTimeNode extends MultiStepNode {
  private static readonly inputSchema = z.object({
    video: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
    time: z.number().nonnegative(),
  });

  public static readonly nodeType: NodeType = {
    id: "extract-frame-at-time",
    name: "Extract Frame at Time",
    type: "extract-frame-at-time",
    description:
      "Extracts a frame at a specific timestamp from a video as a JPEG image using FFmpeg in a Cloudflare Container",
    tags: ["Video", "FFmpeg", "Frame", "Thumbnail", "Image"],
    icon: "image",
    documentation:
      "This node extracts a single frame from a video at a given time (in seconds) and returns it as a JPEG image. Useful for generating thumbnails at a precise moment or extracting key frames for analysis.",
    inlinable: false,
    usage: 3,
    inputs: [
      {
        name: "video",
        type: "video",
        description: "Video to extract a frame from",
        required: true,
      },
      {
        name: "time",
        type: "number",
        description: "Timestamp in seconds to extract the frame at (e.g. 5.5)",
        required: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "Extracted frame as JPEG",
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = ExtractFrameAtTimeNode.inputSchema.parse(
        context.inputs
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const containerBinding = (context.env as any).FFMPEG_CONTAINER as
        | DurableObjectNamespace
        | undefined;
      if (!containerBinding) {
        return this.createErrorResult(
          "FFMPEG_CONTAINER binding is not configured"
        );
      }

      if (!context.objectStore) {
        return this.createErrorResult(
          "ObjectStore not available in context (required for video uploads)"
        );
      }

      const video = validatedInput.video as VideoParameter;
      const presignedUrl = await context.objectStore.writeAndPresign(
        video.data,
        video.mimeType,
        context.organizationId
      );

      // Start frame extraction job on FFmpeg container (durable step — cached on replay)
      const job = await doStep(async () => {
        const id = containerBinding.idFromName("default");
        const stub = containerBinding.get(id);
        const response = await stub.fetch("http://container/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "frame-at-time",
            video: presignedUrl,
            time: validatedInput.time,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to start FFmpeg job: ${response.status} ${errorText}`
          );
        }

        return (await response.json()) as ContainerJob;
      });

      // Poll for completion with durable sleep (zero compute cost between polls)
      const maxPolls = 12;
      let result = job;
      for (let i = 0; i < maxPolls && result.status === "processing"; i++) {
        await sleep(5_000);

        result = await doStep(async () => {
          const id = containerBinding.idFromName("default");
          const stub = containerBinding.get(id);
          const response = await stub.fetch(
            `http://container/jobs/${job.id}`
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Failed to poll job status: ${response.status} ${errorText}`
            );
          }

          return (await response.json()) as ContainerJob;
        });
      }

      if (result.status === "failed") {
        return this.createErrorResult(
          `Frame extraction failed: ${result.error || "Unknown error"}`
        );
      }

      if (result.status !== "completed") {
        return this.createErrorResult(
          "Frame extraction timed out after 1 minute"
        );
      }

      // Download the output image
      const containerId = containerBinding.idFromName("default");
      const containerStub = containerBinding.get(containerId);
      const imageResponse = await containerStub.fetch(
        `http://container/jobs/${job.id}/output`
      );

      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download extracted frame: ${imageResponse.status}`
        );
      }

      const imageData = new Uint8Array(await imageResponse.arrayBuffer());

      return this.createSuccessResult({
        image: {
          data: imageData,
          mimeType: "image/jpeg",
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
