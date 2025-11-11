import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Reddit Get User node implementation
 * Retrieves information about a Reddit user
 */
export class GetUserRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-user-reddit",
    name: "Get User (Reddit)",
    type: "get-user-reddit",
    description: "Get information about a Reddit user",
    tags: ["Social", "Reddit", "User", "Get"],
    icon: "user",
    documentation:
      "This node retrieves detailed information about a Reddit user. Requires a connected Reddit integration.",
    computeCost: 5,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Reddit integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "username",
        type: "string",
        description: "Reddit username (without u/ prefix)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "User ID",
        hidden: true,
      },
      {
        name: "name",
        type: "string",
        description: "Username",
        hidden: false,
      },
      {
        name: "linkKarma",
        type: "number",
        description: "Link karma",
        hidden: false,
      },
      {
        name: "commentKarma",
        type: "number",
        description: "Comment karma",
        hidden: false,
      },
      {
        name: "created",
        type: "number",
        description: "Account creation timestamp",
        hidden: true,
      },
      {
        name: "verified",
        type: "boolean",
        description: "Whether the user is verified",
        hidden: true,
      },
      {
        name: "user",
        type: "json",
        description: "Full user data",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, username } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Reddit integration."
        );
      }

      if (!username || typeof username !== "string") {
        return this.createErrorResult("Username is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get user info via Reddit API
      const response = await fetch(
        `https://oauth.reddit.com/user/${username}/about`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "Dafthunk/1.0",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to get user from Reddit API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: {
          id: string;
          name: string;
          link_karma: number;
          comment_karma: number;
          created: number;
          verified: boolean;
        };
      };

      return this.createSuccessResult({
        id: result.data.id,
        name: result.data.name,
        linkKarma: result.data.link_karma,
        commentKarma: result.data.comment_karma,
        created: result.data.created,
        verified: result.data.verified,
        user: result.data,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting user from Reddit"
      );
    }
  }
}
