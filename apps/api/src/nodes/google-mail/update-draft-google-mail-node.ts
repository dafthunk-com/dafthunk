import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Gmail Update Draft node implementation
 * Updates an existing draft using Google Mail API with OAuth integration
 */
export class UpdateDraftGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "update-draft-google-mail",
    name: "Update Draft (Google Mail)",
    type: "update-draft-google-mail",
    description: "Update an existing draft using Google Mail API",
    tags: ["Email", "Google"],
    icon: "mail",
    documentation:
      "This node updates an existing draft using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
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
        name: "draftId",
        type: "string",
        description: "Draft ID to update",
        required: true,
      },
      {
        name: "to",
        type: "string",
        description: "Recipient email address",
        required: true,
      },
      {
        name: "subject",
        type: "string",
        description: "Email subject",
        required: true,
      },
      {
        name: "body",
        type: "string",
        description: "Email body (plain text or HTML)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "draftId",
        type: "string",
        description: "Updated draft ID",
        hidden: false,
      },
      {
        name: "messageId",
        type: "string",
        description: "Draft message ID",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, draftId, to, subject, body } = context.inputs;
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

      if (!to || typeof to !== "string") {
        return this.createErrorResult("Recipient email address is required");
      }

      if (!subject || typeof subject !== "string") {
        return this.createErrorResult("Email subject is required");
      }

      if (!body || typeof body !== "string") {
        return this.createErrorResult("Email body is required");
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

      // Create RFC 2822 formatted email
      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        body,
      ];
      const email = emailLines.join("\r\n");

      // Encode email as base64url
      const encodedEmail = btoa(email)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Update draft via Gmail API
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              raw: encodedEmail,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to update draft via Gmail API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        message: {
          id: string;
        };
      };

      return this.createSuccessResult({
        draftId: data.id,
        messageId: data.message.id,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error updating draft via Gmail"
      );
    }
  }
}
