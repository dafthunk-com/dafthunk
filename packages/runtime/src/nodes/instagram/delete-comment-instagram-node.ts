import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { instagramRequest } from "./instagram-api";

/**
 * Instagram Delete Comment node implementation
 * Deletes a comment on an Instagram post
 */
export class DeleteCommentInstagramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "delete-comment-instagram",
    name: "Delete Comment (Instagram)",
    type: "delete-comment-instagram",
    description: "Delete a comment on an Instagram post",
    tags: ["Social", "Instagram", "Comment", "Delete", "Moderation"],
    icon: "instagram",
    documentation:
      "This node deletes a comment on one of your Instagram posts, or one of your own comments elsewhere. Deletion is permanent. Requires a connected Instagram integration with the instagram_business_manage_comments permission.",
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
        description: "ID of the comment to delete",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the comment was deleted",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, commentId } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }
      if (!commentId || typeof commentId !== "string") {
        return this.createErrorResult("Comment ID is required");
      }

      const integration = await context.getIntegration(integrationId);

      const result = await instagramRequest<{ success?: boolean }>(
        "delete Instagram comment",
        commentId,
        integration.token,
        { method: "DELETE" }
      );

      return this.createSuccessResult({ success: result.success ?? true });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error deleting Instagram comment"
      );
    }
  }
}
