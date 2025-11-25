import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * GitHub Get File Contents node implementation
 * Retrieves the contents of a file from a GitHub repository
 */
export class GetFileContentsGithubNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-file-contents-github",
    name: "Get File Contents (GitHub)",
    type: "get-file-contents-github",
    description: "Get the contents of a file from a GitHub repository",
    tags: ["Social", "GitHub", "File", "Get"],
    icon: "file-text",
    documentation:
      "This node retrieves the contents of a file from a GitHub repository. Returns both the decoded content and metadata like SHA. Requires a connected GitHub integration.",
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
        description: "Path to the file (e.g., 'README.md' or 'src/index.ts')",
        required: true,
      },
      {
        name: "ref",
        type: "string",
        description: "Branch, tag, or commit SHA (defaults to default branch)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "content",
        type: "string",
        description: "Decoded file contents",
        hidden: false,
      },
      {
        name: "sha",
        type: "string",
        description: "SHA of the file",
        hidden: true,
      },
      {
        name: "size",
        type: "number",
        description: "File size in bytes",
        hidden: false,
      },
      {
        name: "encoding",
        type: "string",
        description: "Encoding of the content",
        hidden: true,
      },
      {
        name: "url",
        type: "string",
        description: "URL to the file on GitHub",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, owner, repo, path, ref } = context.inputs;
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

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Build URL with optional ref parameter
      let url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      if (ref && typeof ref === "string") {
        url += `?ref=${encodeURIComponent(ref)}`;
      }

      // Get file contents via GitHub API
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
          `Failed to get file contents via GitHub API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        type: string;
        encoding: string;
        size: number;
        name: string;
        path: string;
        content: string;
        sha: string;
        url: string;
        html_url: string;
      };

      // Check if it's a file (not a directory)
      if (data.type !== "file") {
        return this.createErrorResult(
          `Path '${path}' is not a file (type: ${data.type})`
        );
      }

      // Decode base64 content
      let decodedContent: string;
      try {
        if (data.encoding === "base64") {
          // In Node.js/Cloudflare Workers, we can use atob or Buffer
          decodedContent = atob(data.content.replace(/\n/g, ""));
        } else {
          decodedContent = data.content;
        }
      } catch (error) {
        return this.createErrorResult(
          `Failed to decode file content: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }

      return this.createSuccessResult({
        content: decodedContent,
        sha: data.sha,
        size: data.size,
        encoding: data.encoding,
        url: data.html_url,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting file contents from GitHub"
      );
    }
  }
}
