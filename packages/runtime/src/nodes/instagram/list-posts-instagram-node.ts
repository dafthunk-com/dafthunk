import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { instagramRequest, instagramUserId } from "./instagram-api";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Instagram List Posts node implementation
 * Lists the connected account's recent Instagram posts
 */
export class ListPostsInstagramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-posts-instagram",
    name: "List Posts (Instagram)",
    type: "list-posts-instagram",
    description: "List the connected Instagram account's recent posts",
    tags: ["Social", "Instagram", "Post", "List"],
    icon: "instagram",
    documentation:
      "This node lists the connected account's recent Instagram posts, newest first. Each post includes its id, caption, media type, media URL, permalink, timestamp, and like/comment counts. Requires a connected Instagram integration.",
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
        name: "limit",
        type: "number",
        description: "Maximum number of posts to return (default 10)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "posts",
        type: "json",
        description: "List of posts",
      },
      {
        name: "count",
        type: "number",
        description: "Number of posts returned",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, limit } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }
      if (limit !== undefined && typeof limit !== "number") {
        return this.createErrorResult("Limit must be a number");
      }
      const effectiveLimit = Math.min(
        Math.max(Math.floor(limit ?? DEFAULT_LIMIT), 1),
        MAX_LIMIT
      );

      const integration = await context.getIntegration(integrationId);
      const userId = instagramUserId(integration);

      const result = await instagramRequest<{ data?: unknown[] }>(
        "list Instagram posts",
        `${userId}/media`,
        integration.token,
        {
          params: {
            fields:
              "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count",
            limit: String(effectiveLimit),
          },
        }
      );

      const posts = result.data ?? [];
      return this.createSuccessResult({ posts, count: posts.length });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing Instagram posts"
      );
    }
  }
}
