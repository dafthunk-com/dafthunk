import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Reddit Get Post node implementation
 * Retrieves information about a specific Reddit post
 */
export class GetPostRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-post-reddit",
    name: "Get Post (Reddit)",
    type: "get-post-reddit",
    description: "Get information about a specific Reddit post",
    tags: ["Social", "Reddit", "Post", "Get"],
    icon: "file-text",
    documentation:
      "This node retrieves detailed information about a specific Reddit post by ID. Requires a connected Reddit integration.",
    usage: 10,
    subscription: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
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
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Post ID",
        hidden: false,
      },
      {
        name: "name",
        type: "string",
        description: "Post full name (t3_ + id)",
        hidden: true,
      },
      {
        name: "title",
        type: "string",
        description: "Post title",
        hidden: false,
      },
      {
        name: "author",
        type: "string",
        description: "Post author username",
        hidden: false,
      },
      {
        name: "subreddit",
        type: "string",
        description: "Subreddit name",
        hidden: false,
      },
      {
        name: "selftext",
        type: "string",
        description: "Post text content (for self posts)",
        hidden: false,
      },
      {
        name: "url",
        type: "string",
        description: "Post URL (for link posts) or Reddit URL",
        hidden: false,
      },
      {
        name: "score",
        type: "number",
        description: "Post score (upvotes - downvotes)",
        hidden: false,
      },
      {
        name: "numComments",
        type: "number",
        description: "Number of comments",
        hidden: false,
      },
      {
        name: "createdUtc",
        type: "number",
        description: "Creation timestamp (UTC)",
        hidden: true,
      },
      {
        name: "permalink",
        type: "string",
        description: "Permalink to the post",
        hidden: true,
      },
      {
        name: "over18",
        type: "boolean",
        description: "Whether the post is NSFW",
        hidden: true,
      },
      {
        name: "post",
        type: "json",
        description: "Full post data",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, postId } = context.inputs;
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

      // Clean post ID and ensure t3_ prefix
      let fullName = postId;
      if (!postId.startsWith("t3_")) {
        fullName = `t3_${postId}`;
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      // Get post info via Reddit API using /api/info endpoint
      const url = new URL("https://oauth.reddit.com/api/info");
      url.searchParams.set("id", fullName);

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
          `Failed to get post from Reddit API: ${errorData}`
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
              selftext: string;
              url: string;
              score: number;
              num_comments: number;
              created_utc: number;
              permalink: string;
              over_18: boolean;
            };
          }>;
        };
      };

      if (!result.data.children || result.data.children.length === 0) {
        return this.createErrorResult("Post not found");
      }

      const post = result.data.children[0].data;

      return this.createSuccessResult({
        id: post.id,
        name: post.name,
        title: post.title,
        author: post.author,
        subreddit: post.subreddit,
        selftext: post.selftext,
        url: post.url,
        score: post.score,
        numComments: post.num_comments,
        createdUtc: post.created_utc,
        permalink: post.permalink,
        over18: post.over_18,
        post,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting post from Reddit"
      );
    }
  }
}
