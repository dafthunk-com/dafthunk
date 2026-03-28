import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * X Delete Post node implementation
 * Deletes a post by ID
 */
export class DeletePostXNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "delete-post-x",
    name: "Delete Post (X)",
    type: "delete-post-x",
    description: "Delete a post by ID",
    tags: ["Social", "X", "Post", "Delete"],
    icon: "trash-2",
    documentation:
      "This node deletes a post by ID. You can only delete posts authored by the authenticated user. Requires a connected X integration with tweet.write scope.",
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
        description: "Post ID to delete",
        required: true,
      },
    ],
    outputs: [
      {
        name: "deleted",
        type: "boolean",
        description: "Whether the post was successfully deleted",
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

      const response = await fetch(`https://api.x.com/2/tweets/${tweetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to delete post via X API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        data: { deleted: boolean };
      };

      return this.createSuccessResult({
        deleted: result.data?.deleted ?? false,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error deleting post on X"
      );
    }
  }
}
