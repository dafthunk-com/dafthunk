import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { INSTAGRAM_CAPTION_LIMIT, instagramRequest } from "./instagram-api";

/**
 * Instagram Comment on Post node implementation
 * Posts a top-level comment on an Instagram post
 */
export class CommentOnPostInstagramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "comment-on-post-instagram",
    name: "Comment on Post (Instagram)",
    type: "comment-on-post-instagram",
    description: "Post a comment on an Instagram post",
    tags: ["Social", "Instagram", "Comment", "Post"],
    icon: "instagram",
    documentation:
      "This node posts a top-level comment on one of your Instagram posts — for example the link-in-first-comment pattern after publishing. Requires a connected Instagram integration with the instagram_business_manage_comments permission.",
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
        description: "Instagram media ID of the post to comment on",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Comment text content",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Created comment ID",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, postId, text } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }
      if (!postId || typeof postId !== "string") {
        return this.createErrorResult("Post ID is required");
      }
      if (!text || typeof text !== "string") {
        return this.createErrorResult("Comment text is required");
      }
      if (text.length > INSTAGRAM_CAPTION_LIMIT) {
        return this.createErrorResult(
          `Comment is ${text.length} characters, above Instagram's limit of ${INSTAGRAM_CAPTION_LIMIT}`
        );
      }

      const integration = await context.getIntegration(integrationId);

      const result = await instagramRequest<{ id?: string }>(
        "comment on Instagram post",
        `${postId}/comments`,
        integration.token,
        { method: "POST", params: { message: text } }
      );

      if (!result.id) {
        return this.createErrorResult("Instagram returned no comment id");
      }
      return this.createSuccessResult({ id: result.id });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error commenting on Instagram post"
      );
    }
  }
}
