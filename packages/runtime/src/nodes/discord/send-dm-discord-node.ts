import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Discord Send Direct Message node implementation
 * Sends a direct message to a Discord user
 */
export class SendDMDiscordNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-dm-discord",
    name: "Send Direct Message (Discord)",
    type: "send-dm-discord",
    description: "Send a direct message to a Discord user",
    tags: ["Social", "Discord", "Message", "Send"],
    icon: "mail",
    documentation:
      "This node sends a direct message to a Discord user. Requires a connected Discord integration. Note: The bot must share a server with the user to DM them.",
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
        name: "userId",
        type: "string",
        description: "Discord user ID to send the message to",
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
        description: "DM channel ID",
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
      const { integrationId, userId, content, embeds } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Discord integration."
        );
      }

      if (!userId || typeof userId !== "string") {
        return this.createErrorResult("User ID is required");
      }

      if (!content || typeof content !== "string") {
        return this.createErrorResult("Message content is required");
      }

      if (content.length > 2000) {
        return this.createErrorResult(
          "Message content must be 2000 characters or less"
        );
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // First, create a DM channel with the user
      const dmResponse = await fetch(
        "https://discord.com/api/v10/users/@me/channels",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient_id: userId,
          }),
        }
      );

      if (!dmResponse.ok) {
        const errorData = await dmResponse.text();
        return this.createErrorResult(
          `Failed to create DM channel via Discord API: ${errorData}`
        );
      }

      const dmChannel = (await dmResponse.json()) as {
        id: string;
      };

      // Prepare message payload
      const payload: {
        content: string;
        embeds?: unknown[];
      } = {
        content,
      };

      // Add embeds if provided
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

      // Send message to DM channel
      const messageResponse = await fetch(
        `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!messageResponse.ok) {
        const errorData = await messageResponse.text();
        return this.createErrorResult(
          `Failed to send DM via Discord API: ${errorData}`
        );
      }

      const message = (await messageResponse.json()) as {
        id: string;
        channel_id: string;
        timestamp: string;
      };

      return this.createSuccessResult({
        id: message.id,
        channelId: message.channel_id,
        timestamp: message.timestamp,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sending DM via Discord"
      );
    }
  }
}
