import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Discord List User Guilds node implementation
 * Lists all guilds (servers) the authenticated user is a member of
 */
export class ListUserGuildsDiscordNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-user-guilds-discord",
    name: "List User Guilds (Discord)",
    type: "list-user-guilds-discord",
    description: "List all guilds (servers) the user is a member of",
    tags: ["Social", "Discord", "Guild", "List"],
    icon: "server",
    documentation:
      "This node retrieves all guilds the authenticated user is a member of. Requires a connected Discord integration with guilds scope.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Discord integration to use",
        hidden: true,
        required: true,
      },
    ],
    outputs: [
      {
        name: "guilds",
        type: "json",
        description: "Array of guild objects",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of guilds",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Discord integration."
        );
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // List user's guilds via Discord API
      const response = await fetch(
        "https://discord.com/api/v10/users/@me/guilds",
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
          `Failed to list user guilds from Discord API: ${errorData}`
        );
      }

      const guilds = (await response.json()) as Array<{
        id: string;
        name: string;
        icon?: string;
        owner: boolean;
        permissions: string;
      }>;

      return this.createSuccessResult({
        guilds,
        count: guilds.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing user guilds from Discord"
      );
    }
  }
}
