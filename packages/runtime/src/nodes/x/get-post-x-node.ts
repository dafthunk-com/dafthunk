import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * X Get Post node implementation
 * Retrieves information about a specific post by ID
 */
export class GetPostXNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-post-x",
    name: "Get Post (X)",
    type: "get-post-x",
    description: "Get information about a specific post by ID",
    tags: ["Social", "X", "Post", "Get"],
    icon: "file-text",
    documentation:
      "This node retrieves detailed information about a specific post by ID using the X API v2. Requires a connected X integration.",
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
        name: "tweetId",
        type: "string",
        description: "Post ID",
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
        name: "text",
        type: "string",
        description: "Post text content",
        hidden: false,
      },
      {
        name: "authorId",
        type: "string",
        description: "Author user ID",
        hidden: false,
      },
      {
        name: "createdAt",
        type: "string",
        description: "Post creation timestamp",
        hidden: false,
      },
      {
        name: "likeCount",
        type: "number",
        description: "Number of likes",
        hidden: false,
      },
      {
        name: "retweetCount",
        type: "number",
        description: "Number of retweets",
        hidden: false,
      },
      {
        name: "replyCount",
        type: "number",
        description: "Number of replies",
        hidden: true,
      },
      {
        name: "impressionCount",
        type: "number",
        description: "Number of impressions",
        hidden: true,
      },
      {
        name: "tweet",
        type: "json",
        description: "Full post data",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, tweetId } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an X integration."
        );
      }

      if (!tweetId || typeof tweetId !== "string") {
        return this.createErrorResult("Post ID is required");
      }

      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      const url = new URL(`https://api.x.com/2/tweets/${tweetId}`);
      url.searchParams.set(
        "tweet.fields",
        "id,text,author_id,created_at,public_metrics,entities,source"
      );

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to get post from X API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: {
          id: string;
          text: string;
          author_id: string;
          created_at: string;
          public_metrics: {
            like_count: number;
            retweet_count: number;
            reply_count: number;
            impression_count: number;
          };
        };
      };

      if (!result.data) {
        return this.createErrorResult("Post not found");
      }

      const tweet = result.data;
      const metrics = tweet.public_metrics;

      return this.createSuccessResult({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        createdAt: tweet.created_at,
        likeCount: metrics?.like_count ?? 0,
        retweetCount: metrics?.retweet_count ?? 0,
        replyCount: metrics?.reply_count ?? 0,
        impressionCount: metrics?.impression_count ?? 0,
        tweet,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting post from X"
      );
    }
  }
}
