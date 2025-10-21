import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * GitHub Get User node implementation
 * Retrieves detailed information about a GitHub user
 */
export class GetUserGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-user-github",
    name: "Get User (GitHub)",
    type: "get-user-github",
    description: "Get information about a GitHub user",
    tags: ["Social", "GitHub", "User", "Get"],
    icon: "user",
    documentation:
      "This node retrieves detailed information about a GitHub user including followers, public repos, bio, and more. Requires a connected GitHub integration.",
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
        description: "GitHub username",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "number",
        description: "User ID",
        hidden: true,
      },
      {
        name: "login",
        type: "string",
        description: "Username",
        hidden: false,
      },
      {
        name: "name",
        type: "string",
        description: "Display name",
        hidden: false,
      },
      {
        name: "bio",
        type: "string",
        description: "User bio",
        hidden: false,
      },
      {
        name: "url",
        type: "string",
        description: "Profile URL",
        hidden: false,
      },
      {
        name: "followers",
        type: "number",
        description: "Number of followers",
        hidden: false,
      },
      {
        name: "following",
        type: "number",
        description: "Number of users following",
        hidden: false,
      },
      {
        name: "publicRepos",
        type: "number",
        description: "Number of public repositories",
        hidden: false,
      },
      {
        name: "company",
        type: "string",
        description: "Company",
        hidden: true,
      },
      {
        name: "location",
        type: "string",
        description: "Location",
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

      if (integration.provider !== "github") {
        return this.createErrorResult(
          "Invalid integration type. This node requires a Github integration."
        );
      }

      const accessToken = integration.token;

      // Get user via GitHub API
      const response = await fetch(`https://api.github.com/users/${username}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Dafthunk/1.0",
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to get user via GitHub API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: number;
        login: string;
        name: string;
        bio: string;
        html_url: string;
        followers: number;
        following: number;
        public_repos: number;
        company: string;
        location: string;
      };

      return this.createSuccessResult({
        id: data.id,
        login: data.login,
        name: data.name,
        bio: data.bio,
        url: data.html_url,
        followers: data.followers,
        following: data.following,
        publicRepos: data.public_repos,
        company: data.company,
        location: data.location,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting user from GitHub"
      );
    }
  }
}
