import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Reddit Vote node implementation
 * Votes on a Reddit post or comment
 */
export class VoteRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "vote-reddit",
    name: "Vote (Reddit)",
    type: "vote-reddit",
    description: "Vote on a Reddit post or comment",
    tags: ["Social", "Reddit", "Vote"],
    icon: "arrow-up",
    documentation:
      "This node casts a vote (upvote, downvote, or unvote) on a Reddit post or comment. Requires a connected Reddit integration.",
    usage: 5,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Reddit integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "thingId",
        type: "string",
        description:
          "Full name of thing to vote on (e.g., t3_abc123 for post or t1_def456 for comment)",
        required: true,
      },
      {
        name: "direction",
        type: "number",
        description:
          "Vote direction: 1 for upvote, -1 for downvote, 0 to unvote",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the vote was successful",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, thingId, direction } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Reddit integration."
        );
      }

      if (!thingId || typeof thingId !== "string") {
        return this.createErrorResult("Thing ID is required");
      }

      if (typeof direction !== "number") {
        return this.createErrorResult(
          "Direction is required and must be a number"
        );
      }

      if (![1, -1, 0].includes(direction as number)) {
        return this.createErrorResult(
          "Direction must be 1 (upvote), -1 (downvote), or 0 (unvote)"
        );
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Prepare form data for vote
      const formData = new URLSearchParams({
        id: thingId,
        dir: (direction as number).toString(),
      });

      // Vote via Reddit API
      const response = await fetch("https://oauth.reddit.com/api/vote", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Dafthunk/1.0",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to vote via Reddit API: ${errorData}`
        );
      }

      return this.createSuccessResult({
        success: true,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error voting on Reddit"
      );
    }
  }
}
