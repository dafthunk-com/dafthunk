import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { INSTAGRAM_CAPTION_LIMIT, instagramRequest } from "./instagram-api";

/**
 * Instagram Reply to Comment node implementation
 * Replies to a comment on an Instagram post
 */
export class ReplyToCommentInstagramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "reply-to-comment-instagram",
    name: "Reply to Comment (Instagram)",
    type: "reply-to-comment-instagram",
    description: "Reply to a comment on an Instagram post",
    tags: ["Social", "Instagram", "Comment", "Reply"],
    icon: "instagram",
    documentation:
      "This node posts a threaded reply to a comment on one of your Instagram posts. Replies can only target top-level comments — replying to a reply fails. Requires a connected Instagram integration with the instagram_business_manage_comments permission.",
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
        name: "commentId",
        type: "string",
        description: "ID of the comment to reply to",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Reply text content",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Created reply comment ID",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, commentId, text } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }
      if (!commentId || typeof commentId !== "string") {
        return this.createErrorResult("Comment ID is required");
      }
      if (!text || typeof text !== "string") {
        return this.createErrorResult("Reply text is required");
      }
      if (text.length > INSTAGRAM_CAPTION_LIMIT) {
        return this.createErrorResult(
          `Reply is ${text.length} characters, above Instagram's limit of ${INSTAGRAM_CAPTION_LIMIT}`
        );
      }

      const integration = await context.getIntegration(integrationId);

      const result = await instagramRequest<{ id?: string }>(
        "reply to Instagram comment",
        `${commentId}/replies`,
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
          : "Unknown error replying to Instagram comment"
      );
    }
  }
}
