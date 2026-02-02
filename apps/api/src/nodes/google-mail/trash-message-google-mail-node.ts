import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Gmail Trash Message node implementation
 * Moves a message to trash using Google Mail API with OAuth integration
 */
export class TrashMessageGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "trash-message-google-mail",
    name: "Trash Message (Google Mail)",
    type: "trash-message-google-mail",
    description: "Move a message to trash using Google Mail API",
    tags: ["Social", "Email", "Google", "Trash"],
    icon: "mail",
    documentation:
      "This node moves a message to trash using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
    usage: 10,
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
        description: "Message ID to trash",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether trash was successful",
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

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Trash message via Gmail API
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to trash message via Gmail API: ${errorData}`
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
          : "Unknown error trashing message via Gmail"
      );
    }
  }
}
