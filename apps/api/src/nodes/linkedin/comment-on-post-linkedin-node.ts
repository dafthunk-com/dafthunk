import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * LinkedIn Comment on Post node implementation
 * Posts a comment on a LinkedIn post or share
 */
export class CommentOnPostLinkedInNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "comment-on-post-linkedin",
    name: "Comment on Post (LinkedIn)",
    type: "comment-on-post-linkedin",
    description: "Post a comment on a LinkedIn post or share",
    tags: ["Social", "LinkedIn", "Post", "Comment"],
    icon: "message-square",
    documentation:
      "This node posts a comment on behalf of the authenticated member on a LinkedIn post, share, or another comment. Requires the w_member_social scope. Requires a connected LinkedIn integration.",
    computeCost: 10,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "LinkedIn integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "postUrn",
        type: "string",
        description:
          "Post URN (e.g., 'urn:li:share:1234567890' or 'urn:li:ugcPost:1234567890')",
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
        name: "commentId",
        type: "string",
        description: "Created comment ID",
        hidden: false,
      },
      {
        name: "commentUrn",
        type: "string",
        description: "Created comment URN",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, postUrn, text } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a LinkedIn integration."
        );
      }

      if (!postUrn || typeof postUrn !== "string") {
        return this.createErrorResult(
          "Post URN is required. Provide the LinkedIn post URN (e.g., 'urn:li:share:1234567890')."
        );
      }

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Comment text is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get user's LinkedIn ID from metadata
      const metadata = integration.metadata as { userId?: string } | undefined;
      const userId = metadata?.userId;

      if (!userId) {
        return this.createErrorResult(
          "LinkedIn user ID not found in integration metadata"
        );
      }

      // Create comment using Social Actions API
      const commentData = {
        actor: `urn:li:person:${userId}`,
        message: {
          text: text as string,
        },
      };

      const response = await fetch(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn as string)}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
            "LinkedIn-Version": "202501",
          },
          body: JSON.stringify(commentData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to post comment via LinkedIn API: ${errorData}`
        );
      }

      // Get comment URN from response header
      const commentUrn = response.headers.get("x-restli-id");

      if (!commentUrn) {
        return this.createErrorResult(
          "Comment created but URN not returned in response"
        );
      }

      // Extract comment ID from URN (format: urn:li:comment:(share:123456,789012))
      const commentId = commentUrn.replace(
        /^urn:li:comment:\(.*,(\d+)\)$/,
        "$1"
      );

      return this.createSuccessResult({
        commentId,
        commentUrn,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error posting comment to LinkedIn"
      );
    }
  }
}
