import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * GitHub Get Repository node implementation
 * Retrieves detailed information about a GitHub repository
 */
export class GetRepositoryGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-repository-github",
    name: "Get Repository (GitHub)",
    type: "get-repository-github",
    description: "Get information about a GitHub repository",
    tags: ["Social", "GitHub", "Repository", "Get"],
    icon: "git-branch",
    documentation:
      "This node retrieves detailed information about a GitHub repository including stars, forks, description, and more. Requires a connected GitHub integration.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "github",
        description: "GitHub integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "owner",
        type: "string",
        description: "Repository owner (username or organization)",
        required: true,
      },
      {
        name: "repo",
        type: "string",
        description: "Repository name",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "number",
        description: "Repository ID",
        hidden: true,
      },
      {
        name: "name",
        type: "string",
        description: "Repository name",
        hidden: false,
      },
      {
        name: "fullName",
        type: "string",
        description: "Full repository name (owner/repo)",
        hidden: false,
      },
      {
        name: "description",
        type: "string",
        description: "Repository description",
        hidden: false,
      },
      {
        name: "url",
        type: "string",
        description: "Repository URL",
        hidden: false,
      },
      {
        name: "stars",
        type: "number",
        description: "Number of stars",
        hidden: false,
      },
      {
        name: "forks",
        type: "number",
        description: "Number of forks",
        hidden: false,
      },
      {
        name: "openIssues",
        type: "number",
        description: "Number of open issues",
        hidden: false,
      },
      {
        name: "defaultBranch",
        type: "string",
        description: "Default branch name",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, owner, repo } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a GitHub integration."
        );
      }

      if (!owner || typeof owner !== "string") {
        return this.createErrorResult("Repository owner is required");
      }

      if (!repo || typeof repo !== "string") {
        return this.createErrorResult("Repository name is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get repository via GitHub API
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
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
          `Failed to get repository via GitHub API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: number;
        name: string;
        full_name: string;
        description: string;
        html_url: string;
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
        default_branch: string;
      };

      return this.createSuccessResult({
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        url: data.html_url,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        defaultBranch: data.default_branch,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting repository from GitHub"
      );
    }
  }
}
