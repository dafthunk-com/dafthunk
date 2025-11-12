import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Microsoft Teams Send Channel Message node implementation
 * Sends messages to Teams channels using Microsoft Graph API with OAuth integration
 */
export class SendChannelMessageTeamsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-channel-message-teams",
    name: "Send Channel Message (Teams)",
    type: "send-channel-message-teams",
    description: "Send a message to a Microsoft Teams channel",
    tags: ["Communication", "Microsoft Teams", "Message", "Send"],
    icon: "message-square",
    documentation:
      "This node sends messages to Microsoft Teams channels using the Microsoft Graph API. Requires a connected Microsoft Teams integration from your organization's integrations.",
    computeCost: 10,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Microsoft Teams integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "teamId",
        type: "string",
        description: "Microsoft Teams team ID",
        required: true,
      },
      {
        name: "channelId",
        type: "string",
        description: "Channel ID to send the message to",
        required: true,
      },
      {
        name: "content",
        type: "string",
        description: "Message content (supports HTML formatting)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Message ID",
        hidden: true,
      },
      {
        name: "createdDateTime",
        type: "string",
        description: "Message creation timestamp",
        hidden: true,
      },
      {
        name: "webUrl",
        type: "string",
        description: "Web URL to view the message",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, teamId, channelId, content } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Microsoft Teams integration."
        );
      }

      if (!teamId || typeof teamId !== "string") {
        return this.createErrorResult("Team ID is required");
      }

      if (!channelId || typeof channelId !== "string") {
        return this.createErrorResult("Channel ID is required");
      }

      if (!content || typeof content !== "string") {
        return this.createErrorResult("Message content is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Prepare message payload (Microsoft Graph format)
      const payload = {
        body: {
          content,
        },
      };

      // Send message via Microsoft Graph API
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
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
          `Failed to send message via Microsoft Graph API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        createdDateTime: string;
        webUrl: string;
      };

      return this.createSuccessResult({
        id: data.id,
        createdDateTime: data.createdDateTime,
        webUrl: data.webUrl,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sending message via Microsoft Teams"
      );
    }
  }
}
