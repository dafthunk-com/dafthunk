import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * X Repost node implementation
 * Reposts a post
 */
export class RepostXNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "repost-x",
    name: "Repost (X)",
    type: "repost-x",
    description: "Repost a post on X",
    tags: ["Social", "X", "Repost", "Retweet"],
    icon: "repeat",
    documentation:
      "This node reposts a post on behalf of the authenticated user. Requires a connected X integration with tweet.write scope.",
    usage: 30,
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
        description: "Post ID to repost",
        required: true,
      },
    ],
    outputs: [
      {
        name: "retweeted",
        type: "boolean",
        description: "Whether the post was successfully reposted",
        hidden: false,
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

      // Get the authenticated user's ID first
      const meResponse = await fetch("https://api.x.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!meResponse.ok) {
        const errorData = await meResponse.text();
        return this.createErrorResult(
          `Failed to get authenticated user: ${errorData}`
        );
      }

      const me = (await meResponse.json()) as {
        data: { id: string };
      };

      // Retweet
      const response = await fetch(
        `https://api.x.com/2/users/${me.data.id}/retweets`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tweet_id: tweetId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to retweet via X API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: { retweeted: boolean };
      };

      return this.createSuccessResult({
        retweeted: result.data?.retweeted ?? false,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error retweeting on X"
      );
    }
  }
}
