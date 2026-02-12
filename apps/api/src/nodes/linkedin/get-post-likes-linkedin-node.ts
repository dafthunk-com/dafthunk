import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

/**
 * LinkedIn Get Post Likes node implementation
 * Retrieves likes on a LinkedIn post, share, or comment
 */
export class GetPostLikesLinkedInNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-post-likes-linkedin",
    name: "Get Post Likes (LinkedIn)",
    type: "get-post-likes-linkedin",
    description: "Retrieve likes on a LinkedIn post, share, or comment",
    tags: ["Social", "LinkedIn", "Post", "Likes", "Get"],
    icon: "heart",
    documentation:
      "This node retrieves likes on a LinkedIn post, share, or comment. Requires the r_member_social scope (note: this scope has restricted access and may require partner approval). Use with posts you have access to. Requires a connected LinkedIn integration.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "linkedin",
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
      {
        name: "count",
        type: "number",
        description: "Number of likes to retrieve (default: 10, max: 100)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "likes",
        type: "json",
        description: "Array of like objects",
        hidden: false,
      },
      {
        name: "totalLikes",
        type: "number",
        description: "Total number of likes",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, postUrn, count } = context.inputs;
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

      // Validate count parameter
      const likeCount =
        count && typeof count === "number" ? Math.min(count, 100) : 10;

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get likes using Social Actions API
      const response = await fetch(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn as string)}/likes?count=${likeCount}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
            "LinkedIn-Version": "202501",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();

        // Provide helpful error messages
        if (response.status === 403) {
          return this.createErrorResult(
            "Access denied. The r_member_social scope may require partner approval, or you don't have permission to view these likes."
          );
        }

        return this.createErrorResult(
          `Failed to retrieve likes via LinkedIn API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        elements?: Array<{
          $URN?: string;
          actor?: string;
          created?: {
            time?: number;
          };
        }>;
        paging?: {
          total?: number;
          count?: number;
          start?: number;
        };
      };

      // Transform likes to simpler format
      const likes =
        result.elements?.map((like) => ({
          urn: like.$URN || "",
          actor: like.actor || "",
          createdTime: like.created?.time || 0,
        })) || [];

      return this.createSuccessResult({
        likes,
        totalLikes: result.paging?.total || likes.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error retrieving likes from LinkedIn"
      );
    }
  }
}
