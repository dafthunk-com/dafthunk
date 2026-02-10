import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Gmail Send Draft node implementation
 * Sends an existing draft using Google Mail API with OAuth integration
 */
export class SendDraftGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-draft-google-mail",
    name: "Send Draft (Google Mail)",
    type: "send-draft-google-mail",
    description: "Send an existing draft using Google Mail API",
    tags: ["Social", "Email", "Google", "Draft", "Send"],
    icon: "mail",
    documentation:
      "This node sends an existing draft using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
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
        name: "draftId",
        type: "string",
        description: "Draft ID to send",
        required: true,
      },
    ],
    outputs: [
      {
        name: "messageId",
        type: "string",
        description: "Sent message ID",
        hidden: false,
      },
      {
        name: "threadId",
        type: "string",
        description: "Thread ID",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, draftId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Mail integration."
        );
      }

      if (!draftId || typeof draftId !== "string") {
        return this.createErrorResult("Draft ID is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Send draft via Gmail API
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: draftId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send draft via Gmail API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        threadId: string;
      };

      return this.createSuccessResult({
        messageId: data.id,
        threadId: data.threadId,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sending draft via Gmail"
      );
    }
  }
}
