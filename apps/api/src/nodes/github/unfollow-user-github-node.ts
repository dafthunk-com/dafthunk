import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * GitHub Unfollow User node implementation
 * Unfollows a GitHub user
 */
export class UnfollowUserGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "unfollow-user-github",
    name: "Unfollow User (GitHub)",
    type: "unfollow-user-github",
    description: "Unfollow a GitHub user",
    tags: ["Social", "GitHub", "User", "Unfollow"],
    icon: "user-minus",
    documentation:
      "This node unfollows a GitHub user on behalf of the authenticated user. Requires a connected GitHub integration with user scope.",
    usage: 10,
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
        description: "GitHub username to unfollow",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the unfollow was successful",
        hidden: false,
      },
      {
        name: "username",
        type: "string",
        description: "Username that was unfollowed",
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

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Unfollow user via GitHub API
      const response = await fetch(
        `https://api.github.com/user/following/${username}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Dafthunk/1.0",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to unfollow user via GitHub API: ${errorData}`
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
          : "Unknown error unfollowing user on GitHub"
      );
    }
  }
}
