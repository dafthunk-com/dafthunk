import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * X Get User node implementation
 * Retrieves user profile information by username
 */
export class GetUserXNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-user-x",
    name: "Get User (X)",
    type: "get-user-x",
    description: "Get user profile information by username",
    tags: ["Social", "X", "User", "Get"],
    icon: "user",
    documentation:
      "This node retrieves an X user's profile information by username. Requires a connected X integration.",
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
        name: "username",
        type: "string",
        description: "X username (without @ prefix)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "User ID",
        hidden: false,
      },
      {
        name: "name",
        type: "string",
        description: "Display name",
        hidden: false,
      },
      {
        name: "username",
        type: "string",
        description: "X handle",
        hidden: false,
      },
      {
        name: "description",
        type: "string",
        description: "User bio",
        hidden: false,
      },
      {
        name: "followersCount",
        type: "number",
        description: "Number of followers",
        hidden: false,
      },
      {
        name: "followingCount",
        type: "number",
        description: "Number of users following",
        hidden: false,
      },
      {
        name: "tweetCount",
        type: "number",
        description: "Total number of posts",
        hidden: true,
      },
      {
        name: "profileImageUrl",
        type: "string",
        description: "Profile image URL",
        hidden: true,
      },
      {
        name: "verified",
        type: "boolean",
        description: "Whether the user is verified",
        hidden: true,
      },
      {
        name: "user",
        type: "json",
        description: "Full user data",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, username } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an X integration."
        );
      }

      if (!username || typeof username !== "string") {
        return this.createErrorResult("Username is required");
      }

      // Strip @ prefix if provided
      const cleanUsername = username.replace(/^@/, "");

      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      const url = new URL(
        `https://api.x.com/2/users/by/username/${cleanUsername}`
      );
      url.searchParams.set(
        "user.fields",
        "id,name,username,description,profile_image_url,public_metrics,verified"
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
          `Failed to get user from X API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: {
          id: string;
          name: string;
          username: string;
          description: string;
          profile_image_url: string;
          verified: boolean;
          public_metrics: {
            followers_count: number;
            following_count: number;
            tweet_count: number;
          };
        };
      };

      if (!result.data) {
        return this.createErrorResult("User not found");
      }

      const user = result.data;
      const metrics = user.public_metrics;

      return this.createSuccessResult({
        id: user.id,
        name: user.name,
        username: user.username,
        description: user.description,
        followersCount: metrics?.followers_count ?? 0,
        followingCount: metrics?.following_count ?? 0,
        tweetCount: metrics?.tweet_count ?? 0,
        profileImageUrl: user.profile_image_url,
        verified: user.verified,
        user,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting user from X"
      );
    }
  }
}
