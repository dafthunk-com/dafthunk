import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * GitHub Create/Update File node implementation
 * Creates or updates a file in a GitHub repository
 */
export class CreateUpdateFileGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "create-update-file-github",
    name: "Create/Update File (GitHub)",
    type: "create-update-file-github",
    description: "Create or update a file in a GitHub repository",
    tags: ["GitHub"],
    icon: "file-edit",
    documentation:
      "This node creates a new file or updates an existing file in a GitHub repository. Requires a connected GitHub integration with repo scope.",
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
      {
        name: "path",
        type: "string",
        description: "Path to the file (e.g., 'README.md' or 'src/index.ts')",
        required: true,
      },
      {
        name: "content",
        type: "string",
        description: "File content",
        required: true,
      },
      {
        name: "message",
        type: "string",
        description: "Commit message",
        required: true,
      },
      {
        name: "branch",
        type: "string",
        description: "Branch to commit to (defaults to default branch)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "content",
        type: "json",
        description: "File metadata",
        hidden: false,
      },
      {
        name: "commit",
        type: "json",
        description: "Commit information",
        hidden: false,
      },
      {
        name: "sha",
        type: "string",
        description: "New SHA of the file",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, owner, repo, path, content, message, branch } =
        context.inputs;
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

      if (!path || typeof path !== "string") {
        return this.createErrorResult("File path is required");
      }

      if (!content || typeof content !== "string") {
        return this.createErrorResult("File content is required");
      }

      if (!message || typeof message !== "string") {
        return this.createErrorResult("Commit message is required");
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

      // Try to get existing file to determine if we're creating or updating
      let existingSha: string | undefined;
      const getResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ""}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Dafthunk/1.0",
          },
        }
      );

      if (getResponse.ok) {
        const existingFile = (await getResponse.json()) as {
          sha: string;
        };
        existingSha = existingFile.sha;
      } else if (getResponse.status !== 404) {
        // If error is not 404 (file not found), something else went wrong
        const errorData = await getResponse.text();
        return this.createErrorResult(
          `Failed to check for existing file via GitHub API: ${errorData}`
        );
      }
      // If 404, file doesn't exist - we'll create it (existingSha remains undefined)

      // Encode content to base64
      const encodedContent = btoa(content);

      // Prepare request payload
      const payload: {
        message: string;
        content: string;
        branch?: string;
        sha?: string;
      } = {
        message,
        content: encodedContent,
      };

      if (branch && typeof branch === "string") {
        payload.branch = branch;
      }

      if (existingSha) {
        payload.sha = existingSha;
      }

      // Create or update file via GitHub API
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "Dafthunk/1.0",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to create/update file via GitHub API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        content: {
          name: string;
          path: string;
          sha: string;
          size: number;
          html_url: string;
        };
        commit: {
          sha: string;
          message: string;
          html_url: string;
        };
      };

      return this.createSuccessResult({
        content: {
          name: data.content.name,
          path: data.content.path,
          size: data.content.size,
          url: data.content.html_url,
        },
        commit: {
          sha: data.commit.sha,
          message: data.commit.message,
          url: data.commit.html_url,
        },
        sha: data.content.sha,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error creating/updating file on GitHub"
      );
    }
  }
}
