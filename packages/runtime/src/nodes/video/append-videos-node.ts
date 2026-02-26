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

const blobSchema = z.object({
  data: z.instanceof(Uint8Array),
  mimeType: z.string(),
});

/**
 * Concatenates multiple videos into a single video using FFmpeg
 * running in a Cloudflare Container. Scales all inputs to match
 * the first video's resolution and handles audio presence automatically.
 */
export class AppendVideosNode extends MultiStepNode {
  private static readonly inputSchema = z.object({
    video_1: blobSchema,
    video_2: blobSchema,
    video_3: blobSchema.optional(),
    video_4: blobSchema.optional(),
    video_5: blobSchema.optional(),
  });

  public static readonly nodeType: NodeType = {
    id: "append-videos",
    name: "Append Videos",
    type: "append-videos",
    description:
      "Concatenates multiple videos into a single video using FFmpeg in a Cloudflare Container",
    tags: ["Video", "FFmpeg", "Concatenate", "Append", "Merge"],
    icon: "video",
    documentation:
      "This node appends multiple videos end-to-end into a single output video. It uses FFmpeg running in a Cloudflare Container for processing. All inputs are scaled to match the first video's resolution (with letterboxing if aspect ratios differ). Audio is included when all inputs have audio tracks, otherwise the output is video-only. Outputs MP4 with H.264 video and AAC audio.",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "video_1",
        type: "video",
        description: "First video in the sequence",
        required: true,
      },
      {
        name: "video_2",
        type: "video",
        description: "Second video in the sequence",
        required: true,
      },
      {
        name: "video_3",
        type: "video",
        description: "Third video (optional)",
        hidden: true,
      },
      {
        name: "video_4",
        type: "video",
        description: "Fourth video (optional)",
        hidden: true,
      },
      {
        name: "video_5",
        type: "video",
        description: "Fifth video (optional)",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "video",
        type: "video",
        description: "Concatenated video",
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = AppendVideosNode.inputSchema.parse(context.inputs);

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

      // Collect video inputs in order
      const videos: VideoParameter[] = [
        validatedInput.video_1,
        validatedInput.video_2,
      ];
      if (validatedInput.video_3) videos.push(validatedInput.video_3);
      if (validatedInput.video_4) videos.push(validatedInput.video_4);
      if (validatedInput.video_5) videos.push(validatedInput.video_5);

      // Upload videos to R2 for presigned download URLs
      const presignedUrls: string[] = [];
      for (const video of videos) {
        const url = await context.objectStore.writeAndPresign(
          video.data,
          video.mimeType,
          context.organizationId
        );
        presignedUrls.push(url);
      }

      // Start concat job on FFmpeg container (durable step — cached on replay)
      const job = await doStep(async () => {
        const id = containerBinding.idFromName("default");
        const stub = containerBinding.get(id);
        const response = await stub.fetch("http://container/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videos: presignedUrls }),
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
          `Video concatenation failed: ${result.error || "Unknown error"}`
        );
      }

      if (result.status !== "completed") {
        return this.createErrorResult(
          "Video concatenation timed out after 5 minutes"
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
          `Failed to download concatenated video: ${videoResponse.status}`
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
