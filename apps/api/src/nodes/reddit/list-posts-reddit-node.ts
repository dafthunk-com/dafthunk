import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Reddit List Posts node implementation
 * Lists posts from a subreddit
 */
export class ListPostsRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-posts-reddit",
    name: "List Posts (Reddit)",
    type: "list-posts-reddit",
    description: "List posts from a subreddit",
    tags: ["Social", "Reddit", "Post", "List"],
    icon: "list",
    documentation:
      "This node retrieves posts from a subreddit. Supports filtering by hot, new, top, rising, or controversial. Requires a connected Reddit integration.",
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
      {
        name: "sort",
        type: "string",
        description: "Sort method: hot, new, top, rising, or controversial",
        required: false,
      },
      {
        name: "timeFilter",
        type: "string",
        description:
          "Time filter for 'top' and 'controversial': hour, day, week, month, year, all",
        required: false,
      },
      {
        name: "limit",
        type: "number",
        description: "Number of posts to retrieve (1-100, default 25)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "posts",
        type: "json",
        description: "Array of post objects",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of posts returned",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, subreddit, sort, timeFilter, limit } =
        context.inputs;
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

      // Validate sort parameter
      const sortMethod = (sort as string) || "hot";
      const validSorts = ["hot", "new", "top", "rising", "controversial"];
      if (!validSorts.includes(sortMethod)) {
        return this.createErrorResult(
          `Invalid sort method. Must be one of: ${validSorts.join(", ")}`
        );
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Build URL with query parameters
      const url = new URL(
        `https://oauth.reddit.com/r/${subreddit}/${sortMethod}`
      );

      if (limit && typeof limit === "number") {
        url.searchParams.set(
          "limit",
          Math.min(100, Math.max(1, limit)).toString()
        );
      } else {
        url.searchParams.set("limit", "25");
      }

      if (
        (sortMethod === "top" || sortMethod === "controversial") &&
        timeFilter &&
        typeof timeFilter === "string"
      ) {
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

      // List posts via Reddit API
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
          `Failed to list posts from Reddit API: ${errorData}`
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

      const posts = result.data.children.map((child) => ({
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
        posts,
        count: posts.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing posts from Reddit"
      );
    }
  }
}
