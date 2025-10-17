import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Gmail Archive Message node implementation
 * Archives a message (removes INBOX label) using Google Mail API with OAuth integration
 */
export class ArchiveMessageGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "archive-message-google-mail",
    name: "Archive Message (Google Mail)",
    type: "archive-message-google-mail",
    description: "Archive a message (remove from inbox) using Google Mail API",
    tags: ["Email", "Google"],
    icon: "mail",
    documentation:
      "This node archives a message by removing the INBOX label using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
    computeCost: 10,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Google Mail integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "messageId",
        type: "string",
        description: "Message ID to archive",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether archive was successful",
        hidden: false,
      },
      {
        name: "messageId",
        type: "string",
        description: "Message ID",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, messageId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Mail integration."
        );
      }

      if (!messageId || typeof messageId !== "string") {
        return this.createErrorResult("Message ID is required");
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

      if (integration.provider !== "google-mail") {
        return this.createErrorResult(
          "Invalid integration type. This node requires a Google Mail integration."
        );
      }

      // Use integration manager to get a valid access token
      let accessToken: string;
      try {
        if (context.integrationManager) {
          accessToken = await context.integrationManager.getValidAccessToken(
            integrationId
          );
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

      // Archive message via Gmail API (remove INBOX label)
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            removeLabelIds: ["INBOX"],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to archive message via Gmail API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
      };

      return this.createSuccessResult({
        success: true,
        messageId: data.id,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error archiving message via Gmail"
      );
    }
  }
}
