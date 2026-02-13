import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

interface RedditCommentRaw {
  id: string;
  name: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  permalink: string;
  parent_id: string;
  depth: number;
  replies?:
    | { data?: { children?: Array<{ data: RedditCommentRaw }> } }
    | string;
}

interface RedditComment {
  id: string;
  name: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  permalink: string;
  parentId: string;
  depth: number;
}

/**
 * Reddit List Comments node implementation
 * Lists comments on a Reddit post
 */
export class ListCommentsRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-comments-reddit",
    name: "List Comments (Reddit)",
    type: "list-comments-reddit",
    description: "List comments on a Reddit post",
    tags: ["Social", "Reddit", "Comment", "List"],
    icon: "message-square",
    documentation:
      "This node retrieves comments from a Reddit post. Supports sorting by best, top, new, controversial, old, or Q&A. Requires a connected Reddit integration.",
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
        name: "postId",
        type: "string",
        description: "Post ID (e.g., abc123 or t3_abc123)",
        required: true,
      },
      {
        name: "subreddit",
        type: "string",
        description: "Subreddit name (without r/ prefix)",
        required: false,
      },
      {
        name: "sort",
        type: "string",
        description: "Sort method: best, top, new, controversial, old, qa",
        required: false,
      },
      {
        name: "limit",
        type: "number",
        description: "Number of comments to retrieve (default 200)",
        required: false,
      },
      {
        name: "depth",
        type: "number",
        description: "Maximum depth of comment tree (default 10)",
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
        name: "post",
        type: "json",
        description: "The parent post data",
        hidden: true,
      },
      {
        name: "count",
        type: "number",
        description: "Number of comments returned",
        hidden: true,
      },
    ],
  };

  private flattenComments(
    comments: Array<{ data: RedditCommentRaw }>,
    result: RedditComment[] = []
  ): RedditComment[] {
    for (const comment of comments) {
      if (comment.data?.body) {
        const { replies, ...raw } = comment.data;
        result.push({
          id: raw.id,
          name: raw.name,
          author: raw.author,
          body: raw.body,
          score: raw.score,
          createdUtc: raw.created_utc,
          permalink: raw.permalink,
          parentId: raw.parent_id,
          depth: raw.depth,
        });

        // Recursively flatten nested replies
        if (replies && typeof replies === "object" && replies.data?.children) {
          this.flattenComments(replies.data.children, result);
        }
      }
    }
    return result;
  }

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, postId, subreddit, sort, limit, depth } =
        context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Reddit integration."
        );
      }

      if (!postId || typeof postId !== "string") {
        return this.createErrorResult("Post ID is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Validate sort parameter
      const sortMethod = (sort as string) || "best";
      const validSorts = ["best", "top", "new", "controversial", "old", "qa"];
      if (!validSorts.includes(sortMethod)) {
        return this.createErrorResult(
          `Invalid sort method. Must be one of: ${validSorts.join(", ")}`
        );
      }

      // Clean post ID (remove t3_ prefix if present)
      const cleanPostId = postId.replace(/^t3_/, "");

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      // Build URL
      const baseUrl =
        subreddit && typeof subreddit === "string"
          ? `https://oauth.reddit.com/r/${subreddit}/comments/${cleanPostId}`
          : `https://oauth.reddit.com/comments/${cleanPostId}`;

      const url = new URL(baseUrl);
      url.searchParams.set("sort", sortMethod);

      if (limit && typeof limit === "number") {
        url.searchParams.set("limit", Math.max(1, limit).toString());
      }

      if (depth && typeof depth === "number") {
        url.searchParams.set("depth", Math.max(1, depth).toString());
      }

      // Get comments via Reddit API
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
          `Failed to list comments from Reddit API: ${errorData}`
        );
      }

      // Reddit returns an array: [post_listing, comments_listing]
      const result = (await response.json()) as [
        { data: { children: Array<{ data: Record<string, unknown> }> } },
        { data: { children: Array<{ data: RedditCommentRaw }> } },
      ];

      const post = result[0]?.data?.children?.[0]?.data;
      const commentsRaw = result[1]?.data?.children || [];

      // Flatten nested comment tree
      const comments = this.flattenComments(commentsRaw);

      return this.createSuccessResult({
        comments,
        post,
        count: comments.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing comments from Reddit"
      );
    }
  }
}
