import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Discord Bot Add Reaction node implementation
 * Adds a reaction emoji to a Discord message using the bot token
 */
export class BotAddReactionDiscordNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bot-add-reaction-discord",
    name: "Bot Add Reaction (Discord)",
    type: "bot-add-reaction-discord",
    description: "Add a reaction emoji to a Discord message as the bot",
    tags: ["Social", "Discord", "Reaction", "Add", "Bot"],
    icon: "smile",
    documentation:
      "This node adds a reaction emoji to a Discord message using the bot token.",
    usage: 10,
    inputs: [
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
      const { channelId, messageId, emoji } = context.inputs;
      const botToken = context.discordBotToken;

      if (!botToken) {
        return this.createErrorResult(
          "Discord bot token is not available. Ensure the workflow is triggered via a configured Discord bot."
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

      const encodedEmoji = encodeURIComponent(emoji);

      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to add reaction via Discord Bot API: ${errorData}`
        );
      }

      return this.createSuccessResult({ success: true });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error adding reaction via Discord bot"
      );
    }
  }
}
