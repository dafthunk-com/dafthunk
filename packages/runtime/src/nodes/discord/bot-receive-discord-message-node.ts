import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotReceiveDiscordMessageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "receive-discord-message",
    name: "Bot Receive Message (Discord)",
    type: "receive-discord-message",
    description:
      "Receive an incoming message from a Discord server via the bot",
    tags: ["Social", "Discord", "Message", "Receive"],
    icon: "message-square",
    documentation:
      "This node receives incoming Discord messages, providing access to guild ID, channel ID, message content, and author details.",
    compatibility: ["discord_event"],
    inlinable: true,
    usage: 0,
    inputs: [
      {
        name: "discordBotId",
        type: "discord",
        description: "The Discord bot to use for this trigger",
        hidden: true,
        required: false,
      },
      {
        name: "guildId",
        type: "string",
        description: "The Discord server (guild) ID to listen on",
        hidden: true,
        required: false,
      },
      {
        name: "channelId",
        type: "string",
        description:
          "The channel ID to filter messages from. Leave empty for all channels",
        hidden: true,
        required: false,
      },
    ],
    outputs: [
      {
        name: "discordBotId",
        type: "string",
        description: "The Discord bot ID used for this trigger",
      },
      {
        name: "guildId",
        type: "string",
        description: "Discord server (guild) ID",
      },
      {
        name: "channelId",
        type: "string",
        description: "Channel ID where the message was sent",
      },
      {
        name: "messageId",
        type: "string",
        description: "Unique message ID",
      },
      {
        name: "content",
        type: "string",
        description: "Message text content",
      },
      {
        name: "authorId",
        type: "string",
        description: "Message author's user ID",
      },
      {
        name: "authorUsername",
        type: "string",
        description: "Message author's username",
      },
      {
        name: "timestamp",
        type: "string",
        description: "ISO timestamp of when the message was sent",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.discordMessage) {
        throw new Error(
          "Discord message information is required but not provided in the context."
        );
      }

      const {
        discordBotId,
        guildId,
        channelId,
        messageId,
        content,
        author,
        timestamp,
      } = context.discordMessage;

      return this.createSuccessResult({
        discordBotId: discordBotId ?? "",
        guildId,
        channelId,
        messageId,
        content,
        authorId: author.id,
        authorUsername: author.username,
        timestamp,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
