import { MultiStepNode, type MultiStepNodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { readOptionalImage } from "../../utils/images";
import {
  captionError,
  createMediaContainer,
  fetchPermalink,
  getContainerStatus,
  instagramUserId,
  publishMediaContainer,
} from "./instagram-api";

/** Instagram rejects reels above 1 GB. */
const INSTAGRAM_MAX_VIDEO_BYTES = 1024 * 1024 * 1024;

const SUPPORTED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

/** Video ingestion is asynchronous and can take minutes for large files. */
const STATUS_POLL_ATTEMPTS = 60;
const STATUS_POLL_INTERVAL_MS = 10_000;

/**
 * Instagram Post Reel node implementation
 * Publishes a video as a reel to an Instagram professional account
 */
export class PostReelInstagramNode extends MultiStepNode {
  public static readonly nodeType: NodeType = {
    id: "post-reel-instagram",
    name: "Post Reel (Instagram)",
    type: "post-reel-instagram",
    description:
      "Publish a video as a reel to an Instagram professional account",
    tags: ["Social", "Instagram", "Post", "Video", "Reel", "Share"],
    icon: "instagram",
    documentation:
      "This node publishes a video to Instagram as a reel — the format Instagram uses for all feed video. It requires a connected Instagram integration for a professional (business or creator) account. Videos must be MP4 or MOV, up to 1 GB and between 3 seconds and 15 minutes; 9:16 aspect ratio is recommended. Instagram processes video asynchronously, so the node waits for ingestion (up to 10 minutes) before publishing. Reels also appear in the feed unless shareToFeed is false. Instagram limits accounts to roughly 100 API-published posts per rolling 24 hours.",
    usage: 20,
    asTool: false,
    inlinable: false,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "instagram",
        description: "Instagram integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "video",
        type: "video",
        description: "Video to publish (MP4 or MOV, max 1 GB)",
        required: true,
      },
      {
        name: "caption",
        type: "string",
        description: "Post caption (max 2200 characters)",
        required: false,
      },
      {
        name: "coverImage",
        type: "image",
        description: "Optional cover image shown before the reel plays",
        required: false,
      },
      {
        name: "shareToFeed",
        type: "boolean",
        description: "Also show the reel in the main feed (default true)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Published Instagram media ID",
      },
      {
        name: "permalink",
        type: "string",
        description: "URL of the published reel",
      },
    ],
  };

  public async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const { sleep, doStep } = context;

    try {
      const { integrationId, caption, shareToFeed } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }

      const videoInput = context.inputs.video;
      if (
        !videoInput ||
        typeof videoInput !== "object" ||
        !(videoInput.data instanceof Uint8Array) ||
        typeof videoInput.mimeType !== "string"
      ) {
        return this.createErrorResult("Video input is missing or invalid");
      }
      const video: { data: Uint8Array; mimeType: string } = {
        data: videoInput.data,
        mimeType: videoInput.mimeType,
      };
      if (!SUPPORTED_VIDEO_TYPES.has(video.mimeType)) {
        return this.createErrorResult(
          `Instagram only accepts MP4 or MOV videos, got ${video.mimeType}`
        );
      }
      if (video.data.byteLength > INSTAGRAM_MAX_VIDEO_BYTES) {
        return this.createErrorResult(
          `Video is ${(video.data.byteLength / 1024 / 1024).toFixed(1)} MB, which exceeds the Instagram limit of 1 GB`
        );
      }

      const captionIssue = captionError(caption);
      if (captionIssue) {
        return this.createErrorResult(captionIssue);
      }
      if (shareToFeed !== undefined && typeof shareToFeed !== "boolean") {
        return this.createErrorResult("shareToFeed must be a boolean");
      }

      const { image: coverImage, error: coverError } = readOptionalImage(
        context.inputs.coverImage
      );
      if (coverError) {
        return this.createErrorResult(coverError);
      }

      if (!context.objectStore) {
        return this.createErrorResult(
          "ObjectStore not available in context (required to hand Instagram a media URL)"
        );
      }
      const objectStore = context.objectStore;

      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;
      const userId = instagramUserId(integration);

      // Instagram fetches media from a URL instead of accepting bytes, so
      // stage the video (and cover) on R2 behind short-lived presigned URLs.
      // Durable steps keep replays from re-uploading or double-posting.
      const videoUrl = await doStep(() =>
        objectStore.writeAndPresign(
          video.data,
          video.mimeType,
          context.organizationId
        )
      );
      const coverUrl = coverImage
        ? await doStep(() =>
            objectStore.writeAndPresign(
              coverImage.data,
              coverImage.mimeType,
              context.organizationId
            )
          )
        : undefined;

      const containerId = await doStep(() =>
        createMediaContainer(userId, accessToken, {
          media_type: "REELS",
          video_url: videoUrl,
          ...(caption && { caption }),
          ...(coverUrl && { cover_url: coverUrl }),
          ...(shareToFeed === false && { share_to_feed: "false" }),
        })
      );

      // Poll ingestion with durable sleeps (no compute burned while waiting).
      let status = await doStep(() =>
        getContainerStatus(containerId, accessToken)
      );
      for (
        let attempt = 1;
        status.statusCode === "IN_PROGRESS" && attempt < STATUS_POLL_ATTEMPTS;
        attempt++
      ) {
        await sleep(STATUS_POLL_INTERVAL_MS);
        status = await doStep(() =>
          getContainerStatus(containerId, accessToken)
        );
      }
      if (status.statusCode === "IN_PROGRESS") {
        return this.createErrorResult(
          "Instagram did not finish processing the video within 10 minutes"
        );
      }
      if (status.statusCode !== "FINISHED") {
        return this.createErrorResult(
          `Instagram could not process the video: ${status.detail ?? status.statusCode}`
        );
      }

      const mediaId = await doStep(() =>
        publishMediaContainer(userId, accessToken, containerId)
      );
      const permalink = await doStep(() =>
        fetchPermalink(mediaId, accessToken)
      );

      return this.createSuccessResult({
        id: mediaId,
        ...(permalink && { permalink }),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error posting reel to Instagram"
      );
    }
  }
}
