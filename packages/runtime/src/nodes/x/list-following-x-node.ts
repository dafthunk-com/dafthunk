import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * X List Following node implementation
 * Retrieves users that a specific user follows
 */
export class ListFollowingXNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-following-x",
    name: "List Following (X)",
    type: "list-following-x",
    description: "Get users that a specific user follows",
    tags: ["Social", "X", "Following", "List"],
    icon: "user-plus",
    documentation:
      "This node retrieves a list of users that a specific user follows by their user ID. Requires a connected X integration.",
    usage: 20,
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
        description: "Number of results to retrieve (1-1000, default 100)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description: "Array of followed user objects",
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

      const url = new URL(`https://api.x.com/2/users/${userId}/following`);
      url.searchParams.set(
        "user.fields",
        "id,name,username,description,profile_image_url,public_metrics"
      );

      if (maxResults && typeof maxResults === "number") {
        url.searchParams.set(
          "max_results",
          Math.min(1000, Math.max(1, maxResults)).toString()
        );
      } else {
        url.searchParams.set("max_results", "100");
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
          `Failed to get following from X API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data?: Array<{
          id: string;
          name: string;
          username: string;
          description: string;
          profile_image_url: string;
          public_metrics?: {
            followers_count: number;
            following_count: number;
            tweet_count: number;
          };
        }>;
      };

      const following = (result.data ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        description: user.description,
        profileImageUrl: user.profile_image_url,
        followersCount: user.public_metrics?.followers_count ?? 0,
        followingCount: user.public_metrics?.following_count ?? 0,
        tweetCount: user.public_metrics?.tweet_count ?? 0,
      }));

      return this.createSuccessResult({
        results: following,
        count: following.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting following from X"
      );
    }
  }
}
