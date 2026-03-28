import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * X List User Mentions node implementation
 * Retrieves posts that mention a specific user
 */
export class ListUserMentionsXNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-user-mentions-x",
    name: "List User Mentions (X)",
    type: "list-user-mentions-x",
    description: "Get posts that mention a specific user",
    tags: ["Social", "X", "User", "Mentions", "List"],
    icon: "at-sign",
    documentation:
      "This node retrieves posts that mention a specific user by their user ID. Requires a connected X integration.",
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
        name: "userId",
        type: "string",
        description: "User ID (numeric)",
        required: true,
      },
      {
        name: "maxResults",
        type: "number",
        description: "Number of results to retrieve (5-100, default 10)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description: "Array of post objects mentioning the user",
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
      const { integrationId, userId, maxResults } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an X integration."
        );
      }

      if (!userId || typeof userId !== "string") {
        return this.createErrorResult("User ID is required");
      }

      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      const url = new URL(`https://api.x.com/2/users/${userId}/mentions`);
      url.searchParams.set(
        "tweet.fields",
        "id,text,author_id,created_at,public_metrics"
      );

      if (maxResults && typeof maxResults === "number") {
        url.searchParams.set(
          "max_results",
          Math.min(100, Math.max(5, maxResults)).toString()
        );
      } else {
        url.searchParams.set("max_results", "10");
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
          `Failed to get user mentions from X API: ${errorData}`
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
          : "Unknown error getting user mentions from X"
      );
    }
  }
}
