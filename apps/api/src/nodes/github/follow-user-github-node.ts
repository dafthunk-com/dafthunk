import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * GitHub Follow User node implementation
 * Follows a GitHub user
 */
export class FollowUserGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "follow-user-github",
    name: "Follow User (GitHub)",
    type: "follow-user-github",
    description: "Follow a GitHub user",
    tags: ["Social", "GitHub", "User", "Follow"],
    icon: "user-plus",
    documentation:
      "This node follows a GitHub user on behalf of the authenticated user. Requires a connected GitHub integration with user scope.",
    computeCost: 10,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "GitHub integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "username",
        type: "string",
        description: "GitHub username to follow",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the follow was successful",
        hidden: false,
      },
      {
        name: "username",
        type: "string",
        description: "Username that was followed",
        hidden: false,
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
          "Integration ID is required. Please select a GitHub integration."
        );
      }

      if (!username || typeof username !== "string") {
        return this.createErrorResult("Username is required");
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

      if (integration.provider !== "github") {
        return this.createErrorResult(
          "Invalid integration type. This node requires a GitHub integration."
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

      // Follow user via GitHub API
      const response = await fetch(
        `https://api.github.com/user/following/${username}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Dafthunk/1.0",
            "Content-Length": "0",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to follow user via GitHub API: ${errorData}`
        );
      }

      return this.createSuccessResult({
        success: true,
        username,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error following user on GitHub"
      );
    }
  }
}
