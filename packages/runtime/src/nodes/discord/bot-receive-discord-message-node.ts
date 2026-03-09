import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotReceiveDiscordMessageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "receive-discord-message",
    name: "Bot Receive Message (Discord)",
    type: "receive-discord-message",
    description:
      "Receive an incoming slash command interaction from Discord via the bot",
    tags: ["Social", "Discord", "Message", "Receive"],
    icon: "message-square",
    documentation:
      "This node receives incoming Discord slash command interactions, providing access to command name, options, user details, and interaction tokens for deferred responses.",
    compatibility: ["discord_event"],
    trigger: true,
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
        name: "commandName",
        type: "string",
        description: "The slash command name to register (e.g. 'run')",
        hidden: true,
        required: false,
      },
    ],
    outputs: [
      {
        name: "channelId",
        type: "string",
        description: "Channel ID where the command was invoked",
      },
      {
        name: "interactionToken",
        type: "string",
        description: "Interaction token for follow-up responses",
      },
      {
        name: "applicationId",
        type: "string",
        description: "Discord application ID",
      },
      {
        name: "commandName",
        type: "string",
        description: "The slash command name that was invoked",
      },
      {
        name: "userId",
        type: "string",
        description: "User ID who invoked the command",
      },
      {
        name: "username",
        type: "string",
        description: "Username who invoked the command",
      },
      {
        name: "guildId",
        type: "string",
        description: "Discord server (guild) ID",
      },
      {
        name: "discordBotId",
        type: "string",
        description: "The Discord bot ID used for this trigger",
      },
      {
        name: "interactionId",
        type: "string",
        description: "Unique interaction ID",
      },
      {
        name: "content",
        type: "string",
        description: "Joined option values as text content",
      },
      {
        name: "options",
        type: "json",
        description: "Command options as JSON object",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.discordInteraction) {
        throw new Error(
          "Discord interaction information is required but not provided in the context."
        );
      }

      const {
        discordBotId,
        commandName,
        interactionId,
        interactionToken,
        applicationId,
        options,
        user,
        guildId,
        channelId,
      } = context.discordInteraction;

      // Join option values into a single string for simple text consumption
      const content = Object.values(options).join(" ");

      return this.createSuccessResult({
        discordBotId,
        commandName,
        interactionId,
        interactionToken,
        applicationId,
        content,
        options,
        userId: user.id,
        username: user.username,
        guildId: guildId ?? "",
        channelId: channelId ?? "",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
