import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Reddit List User Comments node implementation
 * Lists comments made by a Reddit user
 */
export class ListUserCommentsRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-user-comments-reddit",
    name: "List User Comments (Reddit)",
    type: "list-user-comments-reddit",
    description: "List comments made by a Reddit user",
    tags: ["Social", "Reddit", "User", "Comment", "List"],
    icon: "message-circle",
    documentation:
      "This node retrieves comments made by a specific Reddit user. Supports sorting by hot, new, top, or controversial. Requires a connected Reddit integration.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Reddit integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "username",
        type: "string",
        description: "Reddit username (without u/ prefix)",
        required: true,
      },
      {
        name: "sort",
        type: "string",
        description: "Sort method: hot, new, top, controversial",
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
        description: "Number of comments to retrieve (1-100, default 25)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "comments",
        type: "json",
        description: "Array of comment objects",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of comments returned",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, username, sort, timeFilter, limit } =
        context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Reddit integration."
        );
      }

      if (!username || typeof username !== "string") {
        return this.createErrorResult("Username is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Validate sort parameter
      const sortMethod = (sort as string) || "new";
      const validSorts = ["hot", "new", "top", "controversial"];
      if (!validSorts.includes(sortMethod)) {
        return this.createErrorResult(
          `Invalid sort method. Must be one of: ${validSorts.join(", ")}`
        );
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      // Build URL
      const url = new URL(`https://oauth.reddit.com/user/${username}/comments`);
      url.searchParams.set("sort", sortMethod);

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

      // List user comments via Reddit API
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
          `Failed to list user comments from Reddit API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: {
          children: Array<{
            data: {
              id: string;
              name: string;
              author: string;
              body: string;
              subreddit: string;
              score: number;
              created_utc: number;
              permalink: string;
              link_id: string;
              link_title: string;
              parent_id: string;
            };
          }>;
        };
      };

      const comments = result.data.children.map((child) => ({
        id: child.data.id,
        name: child.data.name,
        author: child.data.author,
        body: child.data.body,
        subreddit: child.data.subreddit,
        score: child.data.score,
        createdUtc: child.data.created_utc,
        permalink: child.data.permalink,
        linkId: child.data.link_id,
        linkTitle: child.data.link_title,
        parentId: child.data.parent_id,
      }));

      return this.createSuccessResult({
        comments,
        count: comments.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing user comments from Reddit"
      );
    }
  }
}
