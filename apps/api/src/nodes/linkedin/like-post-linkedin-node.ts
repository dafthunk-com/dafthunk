import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * LinkedIn Like Post node implementation
 * Likes a LinkedIn post, share, or comment
 */
export class LikePostLinkedInNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "like-post-linkedin",
    name: "Like Post (LinkedIn)",
    type: "like-post-linkedin",
    description: "Like a LinkedIn post, share, or comment",
    tags: ["LinkedIn"],
    icon: "heart",
    documentation:
      "This node likes a post, share, or comment on behalf of the authenticated member. Requires the w_member_social scope. Requires a connected LinkedIn integration.",
    computeCost: 5,
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
          "Post URN (e.g., 'urn:li:share:1234567890', 'urn:li:ugcPost:1234567890', or 'urn:li:comment:...')",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the like was successful",
        hidden: false,
      },
      {
        name: "likeUrn",
        type: "string",
        description: "Created like URN",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, postUrn } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a LinkedIn integration."
        );
      }

      if (!postUrn || typeof postUrn !== "string") {
        return this.createErrorResult(
          "Post URN is required. Provide the LinkedIn post URN."
        );
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration from preloaded context
      const integration = context.integrations?.[integrationId];

      if (!integration) {
        return this.createErrorResult(
          "Integration not found or access denied. Please check your integration settings."
        );
      }

      if (integration.provider !== "linkedin") {
        return this.createErrorResult(
          "Invalid integration type. This node requires a LinkedIn integration."
        );
      }

      // Use integration manager to get a valid access token
      let accessToken: string;
      try {
        if (context.integrationManager) {
          accessToken =
            await context.integrationManager.getValidAccessToken(integrationId);
        } else {
          accessToken = integration.token;
        }
      } catch (error) {
        return this.createErrorResult(
          error instanceof Error
            ? error.message
            : "Failed to get valid access token"
        );
      }

      // Get user's LinkedIn ID from metadata
      const metadata = integration.metadata as { userId?: string } | undefined;
      const userId = metadata?.userId;

      if (!userId) {
        return this.createErrorResult(
          "LinkedIn user ID not found in integration metadata"
        );
      }

      // Create like using Social Actions API
      const likeData = {
        actor: `urn:li:person:${userId}`,
      };

      const response = await fetch(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn as string)}/likes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
            "LinkedIn-Version": "202501",
          },
          body: JSON.stringify(likeData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to like post via LinkedIn API: ${errorData}`
        );
      }

      // Get like URN from response header
      const likeUrn = response.headers.get("x-restli-id") || "";

      return this.createSuccessResult({
        success: true,
        likeUrn,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error liking post on LinkedIn"
      );
    }
  }
}
