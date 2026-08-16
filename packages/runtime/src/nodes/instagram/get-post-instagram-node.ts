import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { instagramRequest } from "./instagram-api";

interface InstagramMedia {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
}

/**
 * Instagram Get Post node implementation
 * Retrieves information about a specific Instagram post by ID
 */
export class GetPostInstagramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-post-instagram",
    name: "Get Post (Instagram)",
    type: "get-post-instagram",
    description: "Get information about a specific Instagram post by ID",
    tags: ["Social", "Instagram", "Post", "Get"],
    icon: "instagram",
    documentation:
      "This node retrieves details for one of your Instagram posts by media ID: caption, media type, permalink, timestamp, and like/comment counts. Requires a connected Instagram integration.",
    usage: 10,
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
        name: "postId",
        type: "string",
        description: "Instagram media ID of the post",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Post media ID",
      },
      {
        name: "caption",
        type: "string",
        description: "Post caption",
      },
      {
        name: "mediaType",
        type: "string",
        description: "Media type (IMAGE, VIDEO, or CAROUSEL_ALBUM)",
      },
      {
        name: "permalink",
        type: "string",
        description: "URL of the post",
      },
      {
        name: "likeCount",
        type: "number",
        description: "Number of likes",
      },
      {
        name: "commentsCount",
        type: "number",
        description: "Number of comments",
      },
      {
        name: "timestamp",
        type: "string",
        description: "Post creation timestamp",
        hidden: true,
      },
      {
        name: "post",
        type: "json",
        description: "Full post data",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, postId } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }
      if (!postId || typeof postId !== "string") {
        return this.createErrorResult("Post ID is required");
      }

      const integration = await context.getIntegration(integrationId);

      const post = await instagramRequest<InstagramMedia>(
        "get Instagram post",
        postId,
        integration.token,
        {
          params: {
            fields:
              "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count",
          },
        }
      );

      return this.createSuccessResult({
        id: post.id ?? postId,
        caption: post.caption ?? "",
        mediaType: post.media_type ?? "",
        permalink: post.permalink ?? "",
        likeCount: post.like_count ?? 0,
        commentsCount: post.comments_count ?? 0,
        timestamp: post.timestamp ?? "",
        post,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting Instagram post"
      );
    }
  }
}
