import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

/**
 * Gmail Mark Message node implementation
 * Marks a message as read or unread using Google Mail API with OAuth integration
 */
export class MarkMessageGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "mark-message-google-mail",
    name: "Mark Message (Google Mail)",
    type: "mark-message-google-mail",
    description: "Mark a message as read or unread using Google Mail API",
    tags: ["Social", "Email", "Google", "Mark"],
    icon: "mail",
    documentation:
      "This node marks a message as read or unread using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "google-mail",
        description: "Google Mail integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "messageId",
        type: "string",
        description: "Message ID to mark",
        required: true,
      },
      {
        name: "markAsRead",
        type: "boolean",
        description: "Mark as read (true) or unread (false)",
        required: true,
        value: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether operation was successful",
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
      const { integrationId, messageId, markAsRead = true } = context.inputs;
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

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Modify message labels via Gmail API
      const requestBody =
        markAsRead === true
          ? { removeLabelIds: ["UNREAD"] }
          : { addLabelIds: ["UNREAD"] };

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to mark message via Gmail API: ${errorData}`
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
          : "Unknown error marking message via Gmail"
      );
    }
  }
}
