import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * GitHub Delete File node implementation
 * Deletes a file from a GitHub repository
 */
export class DeleteFileGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "delete-file-github",
    name: "Delete File (GitHub)",
    type: "delete-file-github",
    description: "Delete a file from a GitHub repository",
    tags: ["Social", "GitHub", "File", "Delete"],
    icon: "file-x",
    documentation:
      "This node deletes a file from a GitHub repository. Requires the file's current SHA. Requires a connected GitHub integration with repo scope.",
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
        description: "Path to the file to delete",
        required: true,
      },
      {
        name: "message",
        type: "string",
        description: "Commit message",
        required: true,
      },
      {
        name: "sha",
        type: "string",
        description: "SHA of the file being deleted (required)",
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
        name: "commit",
        type: "json",
        description: "Commit information",
        hidden: false,
      },
      {
        name: "success",
        type: "boolean",
        description: "Whether the deletion was successful",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, owner, repo, path, message, sha, branch } =
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

      if (!message || typeof message !== "string") {
        return this.createErrorResult("Commit message is required");
      }

      if (!sha || typeof sha !== "string") {
        return this.createErrorResult(
          "File SHA is required to delete a file. Use Get File Contents to retrieve the SHA first."
        );
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Prepare request payload
      const payload: {
        message: string;
        sha: string;
        branch?: string;
      } = {
        message,
        sha,
      };

      if (branch && typeof branch === "string") {
        payload.branch = branch;
      }

      // Delete file via GitHub API
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: "DELETE",
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
          `Failed to delete file via GitHub API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        commit: {
          sha: string;
          message: string;
          html_url: string;
        };
      };

      return this.createSuccessResult({
        commit: {
          sha: data.commit.sha,
          message: data.commit.message,
          url: data.commit.html_url,
        },
        success: true,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error deleting file from GitHub"
      );
    }
  }
}
