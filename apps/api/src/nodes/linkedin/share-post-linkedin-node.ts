import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * LinkedIn Share Post node implementation
 * Shares a post to LinkedIn
 */
export class SharePostLinkedInNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "share-post-linkedin",
    name: "Share Post (LinkedIn)",
    type: "share-post-linkedin",
    description: "Share a post to your LinkedIn profile",
    tags: ["LinkedIn"],
    icon: "send",
    documentation:
      "This node shares a post to your LinkedIn profile. Supports text content and optional URLs. Requires a connected LinkedIn integration.",
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
        name: "text",
        type: "string",
        description: "Post text content",
        required: true,
      },
      {
        name: "visibility",
        type: "string",
        description: "Post visibility: PUBLIC or CONNECTIONS",
        required: false,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "LinkedIn post ID",
        hidden: false,
      },
      {
        name: "urn",
        type: "string",
        description: "LinkedIn post URN",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, text, visibility } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a LinkedIn integration."
        );
      }

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Text content is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Validate visibility
      const postVisibility =
        visibility && typeof visibility === "string"
          ? visibility.toUpperCase()
          : "PUBLIC";
      if (postVisibility !== "PUBLIC" && postVisibility !== "CONNECTIONS") {
        return this.createErrorResult(
          "Visibility must be 'PUBLIC' or 'CONNECTIONS'"
        );
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

      // Prepare post data using LinkedIn UGC Post API
      const postData = {
        author: `urn:li:person:${userId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text as string,
            },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": postVisibility,
        },
      };

      // Share post via LinkedIn API
      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to share post via LinkedIn API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        id: string;
      };

      return this.createSuccessResult({
        id: result.id,
        urn: `urn:li:share:${result.id}`,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sharing post to LinkedIn"
      );
    }
  }
}
