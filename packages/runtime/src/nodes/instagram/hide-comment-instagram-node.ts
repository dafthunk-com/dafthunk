import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { instagramRequest } from "./instagram-api";

/**
 * Instagram Hide Comment node implementation
 * Hides or unhides a comment on an Instagram post
 */
export class HideCommentInstagramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "hide-comment-instagram",
    name: "Hide Comment (Instagram)",
    type: "hide-comment-instagram",
    description: "Hide or unhide a comment on an Instagram post",
    tags: ["Social", "Instagram", "Comment", "Hide", "Moderation"],
    icon: "instagram",
    documentation:
      "This node hides a comment on one of your Instagram posts, or unhides it when hide is false. Only top-level comments can be hidden — replies cannot. Hidden comments stay visible to their author. Requires a connected Instagram integration with the instagram_business_manage_comments permission.",
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
        description: "ID of the comment to hide or unhide",
        required: true,
      },
      {
        name: "hide",
        type: "boolean",
        description: "Hide the comment when true, unhide when false",
        required: false,
        value: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the operation succeeded",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, commentId, hide } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an Instagram integration."
        );
      }
      if (!commentId || typeof commentId !== "string") {
        return this.createErrorResult("Comment ID is required");
      }
      if (hide !== undefined && typeof hide !== "boolean") {
        return this.createErrorResult("hide must be a boolean");
      }

      const integration = await context.getIntegration(integrationId);

      const result = await instagramRequest<{ success?: boolean }>(
        hide === false ? "unhide Instagram comment" : "hide Instagram comment",
        commentId,
        integration.token,
        { method: "POST", params: { hide: hide === false ? "false" : "true" } }
      );

      return this.createSuccessResult({ success: result.success ?? true });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error hiding Instagram comment"
      );
    }
  }
}
