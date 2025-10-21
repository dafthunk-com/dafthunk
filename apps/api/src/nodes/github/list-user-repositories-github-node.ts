import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * GitHub List User Repositories node implementation
 * Lists repositories for a specific user
 */
export class ListUserRepositoriesGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-user-repositories-github",
    name: "List User Repositories (GitHub)",
    type: "list-user-repositories-github",
    description: "List repositories for a GitHub user",
    tags: ["Social", "GitHub", "Repository", "List"],
    icon: "folder-git",
    documentation:
      "This node lists all repositories for a specific GitHub user. Can filter by type (all, owner, member) and sort by various criteria. Requires a connected GitHub integration.",
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
      {
        name: "type",
        type: "string",
        description: "Filter by type: 'all', 'owner', 'member'",
        required: false,
      },
      {
        name: "sort",
        type: "string",
        description: "Sort by: 'created', 'updated', 'pushed', 'full_name'",
        required: false,
      },
      {
        name: "direction",
        type: "string",
        description: "Sort direction: 'asc' or 'desc'",
        required: false,
      },
      {
        name: "perPage",
        type: "number",
        description: "Number of results per page (max 100)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "repositories",
        type: "json",
        description: "Array of repositories",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of repositories returned",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, username, type, sort, direction, perPage } =
        context.inputs;
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

      // Build query parameters
      const params = new URLSearchParams();
      if (type && typeof type === "string") {
        params.append("type", type);
      }
      if (sort && typeof sort === "string") {
        params.append("sort", sort);
      }
      if (direction && typeof direction === "string") {
        params.append("direction", direction);
      }
      if (perPage && typeof perPage === "number") {
        params.append("per_page", Math.min(perPage, 100).toString());
      }

      // List user repositories via GitHub API
      const url = `https://api.github.com/users/${username}/repos${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await fetch(url, {
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
          `Failed to list user repositories via GitHub API: ${errorData}`
        );
      }

      const data = (await response.json()) as Array<{
        id: number;
        name: string;
        full_name: string;
        description: string;
        html_url: string;
        private: boolean;
        fork: boolean;
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
        language: string;
        default_branch: string;
        created_at: string;
        updated_at: string;
        pushed_at: string;
      }>;

      const repositories = data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        private: repo.private,
        fork: repo.fork,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        language: repo.language,
        defaultBranch: repo.default_branch,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
      }));

      return this.createSuccessResult({
        repositories,
        count: repositories.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing user repositories from GitHub"
      );
    }
  }
}
