import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { instagramRequest } from "./instagram-api";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Instagram List Comments node implementation
 * Lists comments on an Instagram post
 */
export class ListCommentsInstagramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-comments-instagram",
    name: "List Comments (Instagram)",
    type: "list-comments-instagram",
    description: "List comments on an Instagram post",
    tags: ["Social", "Instagram", "Comment", "List"],
    icon: "instagram",
    documentation:
      "This node lists comments on one of your Instagram posts, newest first. Each comment includes its id, text, timestamp, author username, like count, and parent comment id for replies. Requires a connected Instagram integration with the instagram_business_manage_comments permission.",
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
      {
        name: "limit",
        type: "number",
        description: "Maximum number of comments to return (default 25)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "comments",
        type: "json",
        description: "List of comments",
      },
      {
        name: "count",
        type: "number",
        description: "Number of comments returned",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, postId, limit } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }
      if (!postId || typeof postId !== "string") {
        return this.createErrorResult("Post ID is required");
      }
      if (limit !== undefined && typeof limit !== "number") {
        return this.createErrorResult("Limit must be a number");
      }
      const effectiveLimit = Math.min(
        Math.max(Math.floor(limit ?? DEFAULT_LIMIT), 1),
        MAX_LIMIT
      );

      const integration = await context.getIntegration(integrationId);

      const result = await instagramRequest<{ data?: unknown[] }>(
        "list Instagram comments",
        `${postId}/comments`,
        integration.token,
        {
          params: {
            fields: "id,text,timestamp,username,like_count,parent_id",
            limit: String(effectiveLimit),
          },
        }
      );

      const comments = result.data ?? [];
      return this.createSuccessResult({ comments, count: comments.length });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing Instagram comments"
      );
    }
  }
}
