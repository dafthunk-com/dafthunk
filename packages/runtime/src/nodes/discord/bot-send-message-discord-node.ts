import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotSendMessageDiscordNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bot-send-message-discord",
    name: "Bot Send Message (Discord)",
    type: "bot-send-message-discord",
    description: "Send a message to a Discord channel as the bot",
    tags: ["Social", "Discord", "Message", "Send"],
    icon: "message-circle",
    documentation:
      "This node sends messages to Discord channels using the bot token. The message will appear as coming from the bot.",
    usage: 10,
    inputs: [
      {
        name: "channelId",
        type: "string",
        description: "Discord channel ID to send the message to",
        required: true,
      },
      {
        name: "content",
        type: "string",
        description: "Message content (up to 2000 characters)",
        required: true,
      },
      {
        name: "embeds",
        type: "json",
        description: "Optional embed objects (max 10)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Discord message ID",
        hidden: true,
      },
      {
        name: "channelId",
        type: "string",
        description: "Channel ID where the message was sent",
        hidden: true,
      },
      {
        name: "timestamp",
        type: "string",
        description: "Message timestamp",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { channelId, content, embeds } = context.inputs;
      const botToken = context.discordBotToken;

      if (!botToken) {
        return this.createErrorResult(
          "Discord bot token is not available. Ensure the workflow is triggered via a configured Discord bot."
        );
      }

      if (!channelId || typeof channelId !== "string") {
        return this.createErrorResult("Channel ID is required");
      }

      if (!content || typeof content !== "string") {
        return this.createErrorResult("Message content is required");
      }

      if (content.length > 2000) {
        return this.createErrorResult(
          "Message content must be 2000 characters or less"
        );
      }

      const payload: { content: string; embeds?: unknown[] } = { content };

      if (embeds) {
        if (Array.isArray(embeds)) {
          if (embeds.length > 10) {
            return this.createErrorResult(
              "Maximum of 10 embeds allowed per message"
            );
          }
          payload.embeds = embeds;
        } else {
          payload.embeds = [embeds];
        }
      }

      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send message via Discord Bot API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        channel_id: string;
        timestamp: string;
      };

      return this.createSuccessResult({
        id: data.id,
        channelId: data.channel_id,
        timestamp: data.timestamp,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sending message via Discord bot"
      );
    }
  }
}
