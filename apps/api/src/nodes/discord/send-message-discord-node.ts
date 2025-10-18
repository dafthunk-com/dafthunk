import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Discord Send Message node implementation
 * Sends messages to Discord channels using Discord API with OAuth integration
 */
export class SendMessageDiscordNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-message-discord",
    name: "Send Message (Discord)",
    type: "send-message-discord",
    description: "Send a message to a Discord channel",
    tags: ["Discord", "Messaging"],
    icon: "message-circle",
    documentation:
      "This node sends messages to Discord channels using the Discord API. Requires a connected Discord integration from your organization's integrations.",
    computeCost: 10,
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
      const { integrationId, channelId, content, embeds } = context.inputs;
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

      // Use integration manager to get a valid access token (automatically refreshes if expired)
      let accessToken: string;
      try {
        if (context.integrationManager) {
          accessToken =
            await context.integrationManager.getValidAccessToken(integrationId);
        } else {
          // Fallback to preloaded token if integration manager is not available
          accessToken = integration.token;
        }
      } catch (error) {
        return this.createErrorResult(
          error instanceof Error
            ? error.message
            : "Failed to get valid access token"
        );
      }

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

      // Send message via Discord API
      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send message via Discord API: ${errorData}`
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
          : "Unknown error sending message via Discord"
      );
    }
  }
}
