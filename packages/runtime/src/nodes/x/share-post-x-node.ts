import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  imageFilename,
  imageSizeError,
  readOptionalImage,
  type UploadableImage,
} from "../../utils/images";

/** X rejects images above 5 MB on the media upload endpoint. */
const X_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * X Share Post node implementation
 * Shares a new post on X
 */
export class SharePostXNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "share-post-x",
    name: "Share Post (X)",
    type: "share-post-x",
    description: "Share a new post on X",
    tags: ["Social", "X", "Post", "Share"],
    icon: "send",
    documentation:
      "This node shares a new post to X. Supports text content, an optional image attachment, and optional reply-to. Requires a connected X integration with tweet.write and media.write scopes.",
    usage: 20,
    asTool: true,
    inlinable: false,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "x",
        description: "X integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Post text content (max 280 characters)",
        required: true,
      },
      {
        name: "image",
        type: "image",
        description: "Optional image to attach to the post",
        required: false,
      },
      {
        name: "replyToId",
        type: "string",
        description: "Post ID to reply to (optional)",
        required: false,
      },
      {
        name: "quoteId",
        type: "string",
        description: "Post ID to quote (optional)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Created post ID",
        hidden: false,
      },
      {
        name: "text",
        type: "string",
        description: "Post text content",
        hidden: false,
      },
      {
        name: "tweet",
        type: "json",
        description: "Full post data",
        hidden: true,
      },
    ],
  };

  /**
   * Uploads an image and returns its media id. Images go through the simple
   * upload endpoint in one request; only video needs the chunked variant.
   */
  private async uploadImage(
    accessToken: string,
    image: UploadableImage
  ): Promise<string> {
    const form = new FormData();
    form.append(
      "media",
      new Blob([image.data], { type: image.mimeType }),
      imageFilename(image)
    );
    form.append("media_category", "tweet_image");
    form.append("media_type", image.mimeType);

    const response = await fetch("https://api.x.com/2/media/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to upload image to X: ${errorData}`);
    }

    const result = (await response.json()) as { data?: { id?: string } };
    if (!result.data?.id) {
      throw new Error("X media upload returned no media id");
    }

    return result.data.id;
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, text, replyToId, quoteId } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an X integration."
        );
      }

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Post text is required");
      }

      const { image, error: imageError } = readOptionalImage(
        context.inputs.image
      );
      if (imageError) {
        return this.createErrorResult(imageError);
      }

      if (image) {
        const sizeError = imageSizeError(image, X_MAX_IMAGE_BYTES, "X");
        if (sizeError) {
          return this.createErrorResult(sizeError);
        }
      }

      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      const body: Record<string, unknown> = { text };

      if (image) {
        const mediaId = await this.uploadImage(accessToken, image);
        body.media = { media_ids: [mediaId] };
      }

      if (replyToId && typeof replyToId === "string") {
        body.reply = { in_reply_to_tweet_id: replyToId };
      }

      if (quoteId && typeof quoteId === "string") {
        body.quote_tweet_id = quoteId;
      }

      const response = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to share post via X API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: {
          id: string;
          text: string;
        };
      };

      if (!result.data) {
        return this.createErrorResult("No data returned from X API");
      }

      return this.createSuccessResult({
        id: result.data.id,
        text: result.data.text,
        tweet: result.data,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sharing post on X"
      );
    }
  }
}
