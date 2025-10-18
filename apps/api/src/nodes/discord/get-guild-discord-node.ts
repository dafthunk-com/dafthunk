import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Discord Get Guild node implementation
 * Retrieves information about a Discord guild (server)
 */
export class GetGuildDiscordNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-guild-discord",
    name: "Get Guild (Discord)",
    type: "get-guild-discord",
    description: "Get information about a Discord guild (server)",
    tags: ["Discord", "Guild"],
    icon: "server",
    documentation:
      "This node retrieves detailed information about a Discord guild. Requires a connected Discord integration with guilds scope.",
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
        name: "id",
        type: "string",
        description: "Guild ID",
        hidden: true,
      },
      {
        name: "name",
        type: "string",
        description: "Guild name",
        hidden: false,
      },
      {
        name: "description",
        type: "string",
        description: "Guild description",
        hidden: true,
      },
      {
        name: "memberCount",
        type: "number",
        description: "Approximate member count",
        hidden: false,
      },
      {
        name: "ownerId",
        type: "string",
        description: "Guild owner's user ID",
        hidden: true,
      },
      {
        name: "guild",
        type: "json",
        description: "Full guild object",
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

      // Get guild via Discord API
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}`,
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
          `Failed to get guild from Discord API: ${errorData}`
        );
      }

      const guild = (await response.json()) as {
        id: string;
        name: string;
        description?: string;
        approximate_member_count?: number;
        owner_id: string;
      };

      return this.createSuccessResult({
        id: guild.id,
        name: guild.name,
        description: guild.description,
        memberCount: guild.approximate_member_count,
        ownerId: guild.owner_id,
        guild,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting guild from Discord"
      );
    }
  }
}
