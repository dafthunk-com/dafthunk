import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * GitHub Unstar Repository node implementation
 * Unstars a GitHub repository
 */
export class UnstarRepositoryGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "unstar-repository-github",
    name: "Unstar Repository (GitHub)",
    type: "unstar-repository-github",
    description: "Unstar a GitHub repository",
    tags: ["Social", "GitHub", "Repository", "Unstar"],
    icon: "star-off",
    documentation:
      "This node unstars a GitHub repository on behalf of the authenticated user. Requires a connected GitHub integration with repo scope.",
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
        name: "success",
        type: "boolean",
        description: "Whether the unstar was successful",
        hidden: false,
      },
      {
        name: "repository",
        type: "string",
        description: "Repository that was unstarred (owner/repo)",
        hidden: false,
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

      // Unstar repository via GitHub API
      const response = await fetch(
        `https://api.github.com/user/starred/${owner}/${repo}`,
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
          `Failed to unstar repository via GitHub API: ${errorData}`
        );
      }

      return this.createSuccessResult({
        success: true,
        repository: `${owner}/${repo}`,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error unstarring repository on GitHub"
      );
    }
  }
}
