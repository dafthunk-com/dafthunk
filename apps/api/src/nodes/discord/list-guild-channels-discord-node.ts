import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Discord List Guild Channels node implementation
 * Lists all channels in a Discord guild (server)
 */
export class ListGuildChannelsDiscordNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-guild-channels-discord",
    name: "List Guild Channels (Discord)",
    type: "list-guild-channels-discord",
    description: "List all channels in a Discord guild (server)",
    tags: ["Discord", "Guild", "Channel"],
    icon: "list",
    documentation:
      "This node retrieves all channels in a Discord guild. Requires a connected Discord integration with guilds scope.",
    computeCost: 5,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Discord integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "guildId",
        type: "string",
        description: "Discord guild (server) ID",
        required: true,
      },
    ],
    outputs: [
      {
        name: "channels",
        type: "json",
        description: "Array of channel objects",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of channels",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, guildId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Discord integration."
        );
      }

      if (!guildId || typeof guildId !== "string") {
        return this.createErrorResult("Guild ID is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration from preloaded context
      const integration = context.integrations?.[integrationId];

      if (!integration) {
        return this.createErrorResult(
          "Integration not found or access denied. Please check your integration settings."
        );
      }

      if (integration.provider !== "discord") {
        return this.createErrorResult(
          "Invalid integration type. This node requires a Discord integration."
        );
      }

      // Use integration manager to get a valid access token
      let accessToken: string;
      try {
        if (context.integrationManager) {
          accessToken =
            await context.integrationManager.getValidAccessToken(integrationId);
        } else {
          accessToken = integration.token;
        }
      } catch (error) {
        return this.createErrorResult(
          error instanceof Error
            ? error.message
            : "Failed to get valid access token"
        );
      }

      // List guild channels via Discord API
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/channels`,
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
          `Failed to list guild channels from Discord API: ${errorData}`
        );
      }

      const channels = (await response.json()) as Array<{
        id: string;
        name: string;
        type: number;
      }>;

      return this.createSuccessResult({
        channels,
        count: channels.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing guild channels from Discord"
      );
    }
  }
}
