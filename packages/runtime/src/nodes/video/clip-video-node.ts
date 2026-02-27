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
 * Clips a video to a specified time range using FFmpeg
 * running in a Cloudflare Container. Uses input-seeking for
 * fast operation on large files.
 */
export class ClipVideoNode extends MultiStepNode {
  private static readonly inputSchema = z.object({
    video: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.string(),
    }),
    start_time: z.number().min(0),
    end_time: z.number().min(0),
  });

  public static readonly nodeType: NodeType = {
    id: "clip-video",
    name: "Clip Video",
    type: "clip-video",
    description:
      "Clips a video to a specified time range using FFmpeg in a Cloudflare Container",
    tags: ["Video", "FFmpeg", "Clip", "Trim", "Cut"],
    icon: "scissors",
    documentation:
      "This node trims a video to the specified start and end times (in seconds). It uses FFmpeg running in a Cloudflare Container for processing. Input-seeking is used for fast operation — output is MP4 with H.264 video and AAC audio (when audio is present).",
    inlinable: false,
    usage: 5,
    inputs: [
      {
        name: "video",
        type: "video",
        description: "Video to clip",
        required: true,
      },
      {
        name: "start_time",
        type: "number",
        description: "Start time in seconds",
        required: true,
        value: 0,
      },
      {
        name: "end_time",
        type: "number",
        description: "End time in seconds",
        required: true,
        value: 10,
      },
    ],
    outputs: [
      {
        name: "video",
        type: "video",
        description: "Clipped video",
      },
    ],
  };

  async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const validatedInput = ClipVideoNode.inputSchema.parse(context.inputs);

      if (validatedInput.end_time <= validatedInput.start_time) {
        return this.createErrorResult(
          "end_time must be greater than start_time"
        );
      }

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

      // Start clip job on FFmpeg container (durable step — cached on replay)
      const job = await doStep(async () => {
        const id = containerBinding.idFromName("default");
        const stub = containerBinding.get(id);
        const response = await stub.fetch("http://container/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "clip",
            video: presignedUrl,
            start: validatedInput.start_time,
            end: validatedInput.end_time,
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
          `Video clipping failed: ${result.error || "Unknown error"}`
        );
      }

      if (result.status !== "completed") {
        return this.createErrorResult(
          "Video clipping timed out after 5 minutes"
        );
      }

      // Download the output video
      const containerId = containerBinding.idFromName("default");
      const containerStub = containerBinding.get(containerId);
      const videoResponse = await containerStub.fetch(
        `http://container/jobs/${job.id}/output`
      );

      if (!videoResponse.ok) {
        throw new Error(
          `Failed to download clipped video: ${videoResponse.status}`
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
