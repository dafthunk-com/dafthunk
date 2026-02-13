import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Discord Add Reaction node implementation
 * Adds a reaction emoji to a Discord message
 */
export class AddReactionDiscordNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "add-reaction-discord",
    name: "Add Reaction (Discord)",
    type: "add-reaction-discord",
    description: "Add a reaction emoji to a Discord message",
    tags: ["Social", "Discord", "Reaction", "Add"],
    icon: "smile",
    documentation:
      "This node adds a reaction emoji to a Discord message. Requires a connected Discord integration.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "discord",
        description: "Discord integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "channelId",
        type: "string",
        description: "Discord channel ID containing the message",
        required: true,
      },
      {
        name: "messageId",
        type: "string",
        description: "Discord message ID to react to",
        required: true,
      },
      {
        name: "emoji",
        type: "string",
        description: "Emoji to react with (e.g., '👍' or custom emoji name:id)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the reaction was added successfully",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, channelId, messageId, emoji } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Discord integration."
        );
      }

      if (!channelId || typeof channelId !== "string") {
        return this.createErrorResult("Channel ID is required");
      }

      if (!messageId || typeof messageId !== "string") {
        return this.createErrorResult("Message ID is required");
      }

      if (!emoji || typeof emoji !== "string") {
        return this.createErrorResult("Emoji is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // URL encode the emoji
      const encodedEmoji = encodeURIComponent(emoji);

      // Add reaction via Discord API
      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to add reaction via Discord API: ${errorData}`
        );
      }

      return this.createSuccessResult({
        success: true,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error adding reaction via Discord"
      );
    }
  }
}
