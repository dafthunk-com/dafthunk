import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Reddit Search Subreddits node implementation
 * Searches for subreddits by name or description
 */
export class SearchSubredditsRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "search-subreddits-reddit",
    name: "Search Subreddits (Reddit)",
    type: "search-subreddits-reddit",
    description: "Search for subreddits by name or description",
    tags: ["Social", "Reddit", "Subreddit", "Search"],
    icon: "search",
    documentation:
      "This node searches for subreddits matching a query. Useful for discovering relevant communities. Requires a connected Reddit integration.",
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
        name: "query",
        type: "string",
        description: "Search query for subreddit names or descriptions",
        required: true,
      },
      {
        name: "limit",
        type: "number",
        description: "Number of results to retrieve (1-100, default 25)",
        required: false,
      },
      {
        name: "includeNsfw",
        type: "boolean",
        description: "Include NSFW subreddits in results",
        required: false,
      },
    ],
    outputs: [
      {
        name: "subreddits",
        type: "json",
        description: "Array of subreddit objects",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of subreddits returned",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, query, limit, includeNsfw } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Reddit integration."
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

      // Build URL
      const url = new URL("https://oauth.reddit.com/subreddits/search");
      url.searchParams.set("q", query);

      if (limit && typeof limit === "number") {
        url.searchParams.set(
          "limit",
          Math.min(100, Math.max(1, limit)).toString()
        );
      } else {
        url.searchParams.set("limit", "25");
      }

      if (includeNsfw === true) {
        url.searchParams.set("include_over_18", "true");
      }

      // Search subreddits via Reddit API
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "Dafthunk/1.0",
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to search subreddits from Reddit API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: {
          children: Array<{
            data: {
              id: string;
              display_name: string;
              title: string;
              public_description: string;
              subscribers: number;
              active_user_count?: number;
              over18: boolean;
              url: string;
              created_utc: number;
            };
          }>;
        };
      };

      const subreddits = result.data.children.map((child) => ({
        id: child.data.id,
        name: child.data.display_name,
        title: child.data.title,
        description: child.data.public_description,
        subscribers: child.data.subscribers,
        activeUsers: child.data.active_user_count,
        over18: child.data.over18,
        url: child.data.url,
        createdUtc: child.data.created_utc,
      }));

      return this.createSuccessResult({
        subreddits,
        count: subreddits.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error searching subreddits from Reddit"
      );
    }
  }
}
