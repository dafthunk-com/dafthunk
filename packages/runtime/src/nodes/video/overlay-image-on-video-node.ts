import { MultiStepNode, type MultiStepNodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

interface ContainerJob {
  id: string;
  status: "processing" | "completed" | "failed";
  error?: string;
}

const blobSchema = z.object({
  data: z.instanceof(Uint8Array),
  mimeType: z.string(),
});

/**
 * Overlays an image on top of a video using FFmpeg running in a
 * Cloudflare Container. The image is placed at (x, y) pixels from the
 * top-left corner of the video frame.
 */
export class OverlayImageOnVideoNode extends MultiStepNode {
  private static readonly inputSchema = z.object({
    video: blobSchema,
    image: blobSchema,
    x: z.number().int(),
    y: z.number().int(),
  });

  public static readonly nodeType: NodeType = {
    id: "overlay-image-on-video",
    name: "Overlay Image on Video",
    type: "overlay-image-on-video",
    description:
      "Overlays an image on top of a video using FFmpeg in a Cloudflare Container",
    tags: ["Video", "FFmpeg", "Overlay", "Image", "Watermark"],
    icon: "video",
    documentation:
      "This node overlays an image on top of a video. The image is positioned at the given x and y offsets (in pixels) from the top-left corner of the video frame. It uses FFmpeg running in a Cloudflare Container for processing. Audio is passed through when present. Outputs MP4 with H.264 video and AAC audio.",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "video",
        type: "video",
        description: "Video to overlay the image on",
        required: true,
      },
      {
        name: "image",
        type: "image",
        description: "Image to overlay on top of the video",
        required: true,
      },
      {
        name: "x",
        type: "number",
        description: "Horizontal offset in pixels from the left edge",
        required: true,
        value: 0,
      },
      {
        name: "y",
        type: "number",
        description: "Vertical offset in pixels from the top edge",
        required: true,
        value: 0,
      },
    ],
    outputs: [
      {
        name: "video",
        type: "video",
        description: "Video with the image overlaid",
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = OverlayImageOnVideoNode.inputSchema.parse(
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
          "ObjectStore not available in context (required for uploads)"
        );
      }

      // Upload video and image to R2 for presigned download URLs
      const videoUrl = await context.objectStore.writeAndPresign(
        validatedInput.video.data,
        validatedInput.video.mimeType,
        context.organizationId
      );
      const imageUrl = await context.objectStore.writeAndPresign(
        validatedInput.image.data,
        validatedInput.image.mimeType,
        context.organizationId
      );

      // Start overlay job on FFmpeg container (durable step — cached on replay)
      const job = await doStep(async () => {
        const id = containerBinding.idFromName("default");
        const stub = containerBinding.get(id);
        const response = await stub.fetch("http://container/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "overlay",
            video: videoUrl,
            image: imageUrl,
            x: validatedInput.x,
            y: validatedInput.y,
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
      const maxPolls = 60;
      let result = job;
      for (let i = 0; i < maxPolls && result.status === "processing"; i++) {
        await sleep(5_000);

        result = await doStep(async () => {
          const id = containerBinding.idFromName("default");
          const stub = containerBinding.get(id);
          const response = await stub.fetch(`http://container/jobs/${job.id}`);

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
          `Video overlay failed: ${result.error || "Unknown error"}`
        );
      }

      if (result.status !== "completed") {
        return this.createErrorResult(
          "Video overlay timed out after 5 minutes"
        );
      }

      // Download the output video (outside doStep — binary data is too large
      // for SQLite persistence; re-downloading on replay is fine)
      const containerId = containerBinding.idFromName("default");
      const containerStub = containerBinding.get(containerId);
      const videoResponse = await containerStub.fetch(
        `http://container/jobs/${job.id}/output`
      );

      if (!videoResponse.ok) {
        throw new Error(
          `Failed to download overlaid video: ${videoResponse.status}`
        );
      }

      const videoData = new Uint8Array(await videoResponse.arrayBuffer());

      return this.createSuccessResult({
        video: {
          data: videoData,
          mimeType: "video/mp4",
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
