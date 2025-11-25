import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * GitHub Search Repositories node implementation
 * Searches for repositories using GitHub's search API
 */
export class SearchRepositoriesGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "search-repositories-github",
    name: "Search Repositories (GitHub)",
    type: "search-repositories-github",
    description: "Search for GitHub repositories",
    tags: ["Social", "GitHub", "Repository", "Search"],
    icon: "search",
    documentation:
      "This node searches for repositories on GitHub using various criteria. Supports searching by keywords, language, stars, and more. Use 'sort=stars' and 'order=desc' to find trending repositories. Requires a connected GitHub integration.",
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
        name: "query",
        type: "string",
        description:
          "Search query (e.g., 'react', 'language:typescript stars:>1000')",
        required: true,
      },
      {
        name: "sort",
        type: "string",
        description:
          "Sort field: 'stars', 'forks', 'updated', or leave empty for best match",
        required: false,
      },
      {
        name: "order",
        type: "string",
        description: "Sort order: 'asc' or 'desc'",
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
        name: "totalCount",
        type: "number",
        description: "Total number of results",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of results returned",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, query, sort, order, perPage } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a GitHub integration."
        );
      }

      if (!query || typeof query !== "string") {
        return this.createErrorResult("Search query is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Build query parameters
      const params = new URLSearchParams({
        q: query,
      });

      if (sort && typeof sort === "string") {
        params.append("sort", sort);
      }

      if (order && typeof order === "string") {
        params.append("order", order);
      }

      if (perPage && typeof perPage === "number") {
        params.append("per_page", Math.min(perPage, 100).toString());
      }

      // Search repositories via GitHub API
      const response = await fetch(
        `https://api.github.com/search/repositories?${params.toString()}`,
        {
          method: "GET",
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
          `Failed to search repositories via GitHub API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        total_count: number;
        items: Array<{
          id: number;
          name: string;
          full_name: string;
          description: string;
          html_url: string;
          stargazers_count: number;
          forks_count: number;
          open_issues_count: number;
          language: string;
          owner: { login: string };
          created_at: string;
          updated_at: string;
        }>;
      };

      const repositories = data.items.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        language: repo.language,
        owner: repo.owner.login,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
      }));

      return this.createSuccessResult({
        repositories,
        totalCount: data.total_count,
        count: repositories.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error searching repositories on GitHub"
      );
    }
  }
}
