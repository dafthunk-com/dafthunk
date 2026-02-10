import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Reddit Search node implementation
 * Searches Reddit posts by keyword/query
 */
export class SearchRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "search-reddit",
    name: "Search (Reddit)",
    type: "search-reddit",
    description: "Search Reddit posts by keyword or query",
    tags: ["Social", "Reddit", "Search"],
    icon: "search",
    documentation:
      "This node searches Reddit for posts matching a query. Can be filtered by subreddit, sort order, time period, and result type. Requires a connected Reddit integration.",
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
        description: "Search query (supports Reddit search syntax)",
        required: true,
      },
      {
        name: "subreddit",
        type: "string",
        description: "Limit search to a specific subreddit (without r/ prefix)",
        required: false,
      },
      {
        name: "sort",
        type: "string",
        description: "Sort method: relevance, hot, top, new, or comments",
        required: false,
      },
      {
        name: "timeFilter",
        type: "string",
        description:
          "Time filter for 'top' and 'relevance': hour, day, week, month, year, all",
        required: false,
      },
      {
        name: "type",
        type: "string",
        description: "Filter result type: sr (subreddit), link (post), user",
        required: false,
      },
      {
        name: "limit",
        type: "number",
        description: "Number of results to retrieve (1-100, default 25)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description: "Array of search result objects",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of results returned",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, query, subreddit, sort, timeFilter, type, limit } =
        context.inputs;
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

      // Validate sort parameter
      const sortMethod = (sort as string) || "relevance";
      const validSorts = ["relevance", "hot", "top", "new", "comments"];
      if (!validSorts.includes(sortMethod)) {
        return this.createErrorResult(
          `Invalid sort method. Must be one of: ${validSorts.join(", ")}`
        );
      }

      // Validate type parameter if provided
      if (type && typeof type === "string") {
        const validTypes = ["sr", "link", "user"];
        if (!validTypes.includes(type)) {
          return this.createErrorResult(
            `Invalid type filter. Must be one of: ${validTypes.join(", ")}`
          );
        }
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      // Build URL - use subreddit-specific search if subreddit is provided
      const baseUrl =
        subreddit && typeof subreddit === "string"
          ? `https://oauth.reddit.com/r/${subreddit}/search`
          : "https://oauth.reddit.com/search";

      const url = new URL(baseUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("sort", sortMethod);

      // restrict_sr=true when searching within a subreddit
      if (subreddit && typeof subreddit === "string") {
        url.searchParams.set("restrict_sr", "true");
      }

      if (limit && typeof limit === "number") {
        url.searchParams.set(
          "limit",
          Math.min(100, Math.max(1, limit)).toString()
        );
      } else {
        url.searchParams.set("limit", "25");
      }

      if (timeFilter && typeof timeFilter === "string") {
        const validTimeFilters = [
          "hour",
          "day",
          "week",
          "month",
          "year",
          "all",
        ];
        if (validTimeFilters.includes(timeFilter)) {
          url.searchParams.set("t", timeFilter);
        }
      }

      if (type && typeof type === "string") {
        url.searchParams.set("type", type);
      }

      // Search via Reddit API
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
          `Failed to search Reddit API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: {
          children: Array<{
            data: {
              id: string;
              name: string;
              title: string;
              author: string;
              subreddit: string;
              score: number;
              num_comments: number;
              created_utc: number;
              permalink: string;
              url: string;
              selftext?: string;
              over_18: boolean;
            };
          }>;
        };
      };

      const results = result.data.children.map((child) => ({
        id: child.data.id,
        name: child.data.name,
        title: child.data.title,
        author: child.data.author,
        subreddit: child.data.subreddit,
        score: child.data.score,
        numComments: child.data.num_comments,
        createdUtc: child.data.created_utc,
        permalink: child.data.permalink,
        url: child.data.url,
        selftext: child.data.selftext,
        over18: child.data.over_18,
      }));

      return this.createSuccessResult({
        results,
        count: results.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error searching Reddit"
      );
    }
  }
}
