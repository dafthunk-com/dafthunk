import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * LinkedIn Get Post Comments node implementation
 * Retrieves comments on a LinkedIn post or share
 */
export class GetPostCommentsLinkedInNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-post-comments-linkedin",
    name: "Get Post Comments (LinkedIn)",
    type: "get-post-comments-linkedin",
    description: "Retrieve comments on a LinkedIn post or share",
    tags: ["Social", "LinkedIn", "Post", "Comments", "Get"],
    icon: "message-square",
    documentation:
      "This node retrieves comments on a LinkedIn post or share. Requires the r_member_social scope (note: this scope has restricted access and may require partner approval). Use with posts you have access to. Requires a connected LinkedIn integration.",
    usage: 5,
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
        name: "count",
        type: "number",
        description: "Number of comments to retrieve (default: 10, max: 100)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "comments",
        type: "json",
        description: "Array of comment objects",
        hidden: false,
      },
      {
        name: "totalComments",
        type: "number",
        description: "Total number of comments",
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
      const commentCount =
        count && typeof count === "number" ? Math.min(count, 100) : 10;

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get comments using Social Actions API
      const response = await fetch(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn as string)}/comments?count=${commentCount}`,
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
            "Access denied. The r_member_social scope may require partner approval, or you don't have permission to view these comments."
          );
        }

        return this.createErrorResult(
          `Failed to retrieve comments via LinkedIn API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        elements?: Array<{
          $URN?: string;
          message?: {
            text?: string;
          };
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

      // Transform comments to simpler format
      const comments =
        result.elements?.map((comment) => ({
          urn: comment.$URN || "",
          text: comment.message?.text || "",
          actor: comment.actor || "",
          createdTime: comment.created?.time || 0,
        })) || [];

      return this.createSuccessResult({
        comments,
        totalComments: result.paging?.total || comments.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error retrieving comments from LinkedIn"
      );
    }
  }
}
