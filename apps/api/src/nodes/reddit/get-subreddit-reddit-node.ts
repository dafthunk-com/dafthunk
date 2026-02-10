import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Reddit Get Subreddit node implementation
 * Retrieves information about a subreddit
 */
export class GetSubredditRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-subreddit-reddit",
    name: "Get Subreddit (Reddit)",
    type: "get-subreddit-reddit",
    description: "Get information about a subreddit",
    tags: ["Social", "Reddit", "Subreddit", "Get"],
    icon: "info",
    documentation:
      "This node retrieves detailed information about a subreddit. Requires a connected Reddit integration.",
    usage: 10,
    subscription: true,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "reddit",
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
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Subreddit ID",
        hidden: true,
      },
      {
        name: "name",
        type: "string",
        description: "Subreddit display name",
        hidden: false,
      },
      {
        name: "title",
        type: "string",
        description: "Subreddit title",
        hidden: false,
      },
      {
        name: "description",
        type: "string",
        description: "Subreddit description",
        hidden: false,
      },
      {
        name: "subscribers",
        type: "number",
        description: "Number of subscribers",
        hidden: false,
      },
      {
        name: "activeUsers",
        type: "number",
        description: "Active users count",
        hidden: true,
      },
      {
        name: "over18",
        type: "boolean",
        description: "Whether the subreddit is NSFW",
        hidden: true,
      },
      {
        name: "subreddit",
        type: "json",
        description: "Full subreddit data",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, subreddit } = context.inputs;
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

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get subreddit info via Reddit API
      const response = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/about`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "Dafthunk/1.0",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to get subreddit from Reddit API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: {
          id: string;
          display_name: string;
          title: string;
          public_description: string;
          subscribers: number;
          active_user_count?: number;
          over18: boolean;
        };
      };

      return this.createSuccessResult({
        id: result.data.id,
        name: result.data.display_name,
        title: result.data.title,
        description: result.data.public_description,
        subscribers: result.data.subscribers,
        activeUsers: result.data.active_user_count,
        over18: result.data.over18,
        subreddit: result.data,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting subreddit from Reddit"
      );
    }
  }
}
