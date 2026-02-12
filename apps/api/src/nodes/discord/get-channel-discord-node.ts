import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Discord Get Channel node implementation
 * Retrieves information about a Discord channel
 */
export class GetChannelDiscordNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-channel-discord",
    name: "Get Channel (Discord)",
    type: "get-channel-discord",
    description: "Get information about a Discord channel",
    tags: ["Social", "Discord", "Channel", "Get"],
    icon: "hash",
    documentation:
      "This node retrieves detailed information about a Discord channel. Requires a connected Discord integration.",
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
        description: "Discord channel ID",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Channel ID",
        hidden: true,
      },
      {
        name: "name",
        type: "string",
        description: "Channel name",
        hidden: false,
      },
      {
        name: "type",
        type: "number",
        description: "Channel type (0=text, 2=voice, 4=category, etc.)",
        hidden: true,
      },
      {
        name: "guildId",
        type: "string",
        description: "Guild (server) ID",
        hidden: true,
      },
      {
        name: "topic",
        type: "string",
        description: "Channel topic",
        hidden: true,
      },
      {
        name: "channel",
        type: "json",
        description: "Full channel object",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, channelId } = context.inputs;
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

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get channel via Discord API
      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to get channel from Discord API: ${errorData}`
        );
      }

      const channel = (await response.json()) as {
        id: string;
        name: string;
        type: number;
        guild_id?: string;
        topic?: string;
      };

      return this.createSuccessResult({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        guildId: channel.guild_id,
        topic: channel.topic,
        channel,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting channel from Discord"
      );
    }
  }
}
