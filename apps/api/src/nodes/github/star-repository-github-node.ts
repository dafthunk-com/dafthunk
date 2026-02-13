import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * GitHub Star Repository node implementation
 * Stars a GitHub repository
 */
export class StarRepositoryGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "star-repository-github",
    name: "Star Repository (GitHub)",
    type: "star-repository-github",
    description: "Star a GitHub repository",
    tags: ["Social", "GitHub", "Repository", "Star"],
    icon: "star",
    documentation:
      "This node stars a GitHub repository on behalf of the authenticated user. Requires a connected GitHub integration with repo scope.",
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
        description: "Whether the star was successful",
        hidden: false,
      },
      {
        name: "repository",
        type: "string",
        description: "Repository that was starred (owner/repo)",
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

      // Star repository via GitHub API
      const response = await fetch(
        `https://api.github.com/user/starred/${owner}/${repo}`,
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
          `Failed to star repository via GitHub API: ${errorData}`
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
          : "Unknown error starring repository on GitHub"
      );
    }
  }
}
