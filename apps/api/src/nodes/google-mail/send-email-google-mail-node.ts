import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Gmail Send Email node implementation
 * Sends emails using Google Mail API with OAuth integration
 */
export class SendEmailGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-email-google-mail",
    name: "Send Email (Google Mail)",
    type: "send-email-google-mail",
    description: "Send an email using Google Mail API",
    tags: ["Email", "Google"],
    icon: "mail",
    documentation:
      "This node sends emails using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
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
        name: "id",
        type: "string",
        description: "Gmail message ID",
        hidden: true,
      },
      {
        name: "threadId",
        type: "string",
        description: "Gmail thread ID",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, to, subject, body } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Mail integration."
        );
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

      // Send email via Gmail API
      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            raw: encodedEmail,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send email via Gmail API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        threadId: string;
      };

      return this.createSuccessResult({
        id: data.id,
        threadId: data.threadId,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sending email via Gmail"
      );
    }
  }
}
