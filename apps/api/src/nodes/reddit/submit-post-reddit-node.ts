import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Reddit Submit Post node implementation
 * Submits a new post to a subreddit
 */
export class SubmitPostRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "submit-post-reddit",
    name: "Submit Post (Reddit)",
    type: "submit-post-reddit",
    description: "Submit a new post to a subreddit",
    tags: ["Reddit", "Post", "Submit"],
    icon: "send",
    documentation:
      "This node submits a new post to a specified subreddit. Supports both text posts and link posts. Requires a connected Reddit integration.",
    computeCost: 10,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Reddit integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "subreddit",
        type: "string",
        description: "Subreddit name (without r/ prefix)",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "Post title (max 300 characters)",
        required: true,
      },
      {
        name: "kind",
        type: "string",
        description: "Post type: 'self' for text or 'link' for URL",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Post text content (for self posts)",
        required: false,
      },
      {
        name: "url",
        type: "string",
        description: "Post URL (for link posts)",
        required: false,
      },
      {
        name: "nsfw",
        type: "boolean",
        description: "Mark post as NSFW",
        required: false,
      },
      {
        name: "spoiler",
        type: "boolean",
        description: "Mark post as spoiler",
        required: false,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Reddit post ID",
        hidden: false,
      },
      {
        name: "name",
        type: "string",
        description: "Reddit full name (kind + id)",
        hidden: true,
      },
      {
        name: "url",
        type: "string",
        description: "Post URL on Reddit",
        hidden: false,
      },
      {
        name: "permalink",
        type: "string",
        description: "Post permalink",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        integrationId,
        subreddit,
        title,
        kind,
        text,
        url,
        nsfw,
        spoiler,
      } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Reddit integration."
        );
      }

      if (!subreddit || typeof subreddit !== "string") {
        return this.createErrorResult("Subreddit is required");
      }

      if (!title || typeof title !== "string") {
        return this.createErrorResult("Title is required");
      }

      if (!kind || typeof kind !== "string") {
        return this.createErrorResult("Post kind is required (self or link)");
      }

      if (kind !== "self" && kind !== "link") {
        return this.createErrorResult("Post kind must be 'self' or 'link'");
      }

      if (kind === "self" && (!text || typeof text !== "string")) {
        return this.createErrorResult("Text is required for self posts");
      }

      if (kind === "link" && (!url || typeof url !== "string")) {
        return this.createErrorResult("URL is required for link posts");
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

      if (integration.provider !== "reddit") {
        return this.createErrorResult(
          "Invalid integration type. This node requires a Reddit integration."
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

      // Prepare form data for submission
      const formData = new URLSearchParams({
        api_type: "json",
        sr: subreddit,
        title,
        kind,
      });

      if (kind === "self" && text) {
        formData.append("text", text as string);
      } else if (kind === "link" && url) {
        formData.append("url", url as string);
      }

      if (nsfw === true) {
        formData.append("nsfw", "true");
      }

      if (spoiler === true) {
        formData.append("spoiler", "true");
      }

      // Submit post via Reddit API
      const response = await fetch("https://oauth.reddit.com/api/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Dafthunk/1.0",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to submit post via Reddit API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        json: {
          errors: any[];
          data?: {
            id: string;
            name: string;
            url: string;
            permalink?: string;
          };
        };
      };

      if (result.json.errors && result.json.errors.length > 0) {
        return this.createErrorResult(
          `Reddit API error: ${JSON.stringify(result.json.errors)}`
        );
      }

      if (!result.json.data) {
        return this.createErrorResult("No data returned from Reddit API");
      }

      return this.createSuccessResult({
        id: result.json.data.id,
        name: result.json.data.name,
        url: result.json.data.url,
        permalink: result.json.data.permalink,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error submitting post to Reddit"
      );
    }
  }
}
