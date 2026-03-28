import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * X Follow User node implementation
 * Follows a user on behalf of the authenticated user
 */
export class FollowUserXNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "follow-user-x",
    name: "Follow User (X)",
    type: "follow-user-x",
    description: "Follow a user on X",
    tags: ["Social", "X", "Follow", "User"],
    icon: "user-plus",
    documentation:
      "This node follows a user on behalf of the authenticated user. Requires a connected X integration with follows.write scope.",
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
        name: "targetUserId",
        type: "string",
        description: "User ID to follow (numeric)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "following",
        type: "boolean",
        description: "Whether the user is now being followed",
        hidden: false,
      },
      {
        name: "pendingFollow",
        type: "boolean",
        description:
          "Whether the follow request is pending (protected account)",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, targetUserId } = context.inputs;

      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select an X integration."
        );
      }

      if (!targetUserId || typeof targetUserId !== "string") {
        return this.createErrorResult("Target user ID is required");
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

      // Follow the user
      const response = await fetch(
        `https://api.x.com/2/users/${me.data.id}/following`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ target_user_id: targetUserId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to follow user via X API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: { following: boolean; pending_follow: boolean };
      };

      return this.createSuccessResult({
        following: result.data?.following ?? false,
        pendingFollow: result.data?.pending_follow ?? false,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error following user on X"
      );
    }
  }
}
