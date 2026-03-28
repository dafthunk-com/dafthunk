import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * X Search Posts node implementation
 * Searches recent posts matching a query
 */
export class SearchPostsXNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "search-posts-x",
    name: "Search Posts (X)",
    type: "search-posts-x",
    description: "Search recent posts matching a query",
    tags: ["Social", "X", "Search"],
    icon: "search",
    documentation:
      "This node searches for recent posts (last 7 days) matching a query using the X API v2 search endpoint. Supports X search operators. Requires a connected X integration.",
    usage: 10,
    subscription: true,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "x",
        description: "X integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "query",
        type: "string",
        description:
          "Search query (supports X search operators like from:, to:, has:, etc.)",
        required: true,
      },
      {
        name: "maxResults",
        type: "number",
        description: "Number of results to retrieve (10-100, default 10)",
        required: false,
      },
      {
        name: "sortOrder",
        type: "string",
        description: "Sort order: recency or relevancy (default: recency)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description: "Array of post objects",
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
      const { integrationId, query, maxResults, sortOrder } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an X integration."
        );
      }

      if (!query || typeof query !== "string") {
        return this.createErrorResult("Search query is required");
      }

      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      const url = new URL("https://api.x.com/2/tweets/search/recent");
      url.searchParams.set("query", query);
      url.searchParams.set(
        "tweet.fields",
        "id,text,author_id,created_at,public_metrics,entities,source"
      );

      if (maxResults && typeof maxResults === "number") {
        url.searchParams.set(
          "max_results",
          Math.min(100, Math.max(10, maxResults)).toString()
        );
      } else {
        url.searchParams.set("max_results", "10");
      }

      if (sortOrder && typeof sortOrder === "string") {
        const validOrders = ["recency", "relevancy"];
        if (validOrders.includes(sortOrder)) {
          url.searchParams.set("sort_order", sortOrder);
        }
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to search posts via X API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data?: Array<{
          id: string;
          text: string;
          author_id: string;
          created_at: string;
          public_metrics?: {
            like_count: number;
            retweet_count: number;
            reply_count: number;
            impression_count: number;
          };
        }>;
        meta?: {
          result_count: number;
        };
      };

      const tweets = (result.data ?? []).map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        createdAt: tweet.created_at,
        likeCount: tweet.public_metrics?.like_count ?? 0,
        retweetCount: tweet.public_metrics?.retweet_count ?? 0,
        replyCount: tweet.public_metrics?.reply_count ?? 0,
        impressionCount: tweet.public_metrics?.impression_count ?? 0,
      }));

      return this.createSuccessResult({
        results: tweets,
        count: tweets.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error searching posts on X"
      );
    }
  }
}
