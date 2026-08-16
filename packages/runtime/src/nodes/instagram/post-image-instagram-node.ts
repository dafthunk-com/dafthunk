import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { imageSizeError, readOptionalImage } from "../../utils/images";
import {
  captionError,
  createMediaContainer,
  fetchPermalink,
  getContainerStatus,
  instagramUserId,
  publishMediaContainer,
} from "./instagram-api";

/** Instagram rejects feed images above 8 MB. */
const INSTAGRAM_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Feed photos must be JPEG; Instagram accepts PNG and converts it. */
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

/** Image containers are usually ready immediately; this bounds the wait. */
const STATUS_POLL_ATTEMPTS = 10;
const STATUS_POLL_INTERVAL_MS = 2_000;

/**
 * Instagram Post Image node implementation
 * Publishes an image post to an Instagram professional account
 */
export class PostImageInstagramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "post-image-instagram",
    name: "Post Image (Instagram)",
    type: "post-image-instagram",
    description: "Publish an image to an Instagram professional account",
    tags: ["Social", "Instagram", "Post", "Image", "Share"],
    icon: "instagram",
    documentation:
      "This node publishes an image post to Instagram. It requires a connected Instagram integration for a professional (business or creator) account. Images must be JPEG or PNG up to 8 MB with an aspect ratio between 4:5 and 1.91:1 — Instagram converts PNG on ingest but may reject unusual ratios. Instagram limits accounts to roughly 100 API-published posts per rolling 24 hours.",
    usage: 20,
    asTool: true,
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
        name: "image",
        type: "image",
        description: "Image to publish (JPEG or PNG, max 8 MB)",
        required: true,
      },
      {
        name: "caption",
        type: "string",
        description: "Post caption (max 2200 characters)",
        required: false,
      },
      {
        name: "altText",
        type: "string",
        description: "Accessibility alt text for the image (optional)",
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
        description: "URL of the published post",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, caption, altText } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }

      const { image, error: imageError } = readOptionalImage(
        context.inputs.image
      );
      if (imageError) {
        return this.createErrorResult(imageError);
      }
      if (!image) {
        return this.createErrorResult("Image is required");
      }
      if (!SUPPORTED_IMAGE_TYPES.has(image.mimeType)) {
        return this.createErrorResult(
          `Instagram only accepts JPEG or PNG images, got ${image.mimeType}`
        );
      }
      const sizeError = imageSizeError(
        image,
        INSTAGRAM_MAX_IMAGE_BYTES,
        "Instagram"
      );
      if (sizeError) {
        return this.createErrorResult(sizeError);
      }

      const captionIssue = captionError(caption);
      if (captionIssue) {
        return this.createErrorResult(captionIssue);
      }
      if (altText !== undefined && typeof altText !== "string") {
        return this.createErrorResult("Alt text must be a string");
      }

      if (!context.objectStore) {
        return this.createErrorResult(
          "ObjectStore not available in context (required to hand Instagram a media URL)"
        );
      }

      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;
      const userId = instagramUserId(integration);

      // Instagram fetches media from a URL instead of accepting bytes, so
      // stage the image on R2 behind a short-lived presigned URL.
      const imageUrl = await context.objectStore.writeAndPresign(
        image.data,
        image.mimeType,
        context.organizationId
      );

      const containerId = await createMediaContainer(userId, accessToken, {
        image_url: imageUrl,
        ...(caption && { caption }),
        ...(altText && { alt_text: altText }),
      });

      let status = await getContainerStatus(containerId, accessToken);
      for (
        let attempt = 1;
        status.statusCode === "IN_PROGRESS" && attempt < STATUS_POLL_ATTEMPTS;
        attempt++
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, STATUS_POLL_INTERVAL_MS)
        );
        status = await getContainerStatus(containerId, accessToken);
      }
      if (status.statusCode === "IN_PROGRESS") {
        return this.createErrorResult(
          "Instagram did not finish processing the image in time"
        );
      }
      if (status.statusCode !== "FINISHED") {
        return this.createErrorResult(
          `Instagram could not process the image: ${status.detail ?? status.statusCode}`
        );
      }

      const mediaId = await publishMediaContainer(
        userId,
        accessToken,
        containerId
      );
      const permalink = await fetchPermalink(mediaId, accessToken);

      return this.createSuccessResult({
        id: mediaId,
        ...(permalink && { permalink }),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error posting image to Instagram"
      );
    }
  }
}
