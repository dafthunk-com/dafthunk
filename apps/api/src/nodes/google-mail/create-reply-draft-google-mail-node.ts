import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Gmail Create Reply Draft node implementation
 * Creates a draft reply to an email using Google Mail API with OAuth integration
 */
export class CreateReplyDraftGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "create-reply-draft-google-mail",
    name: "Create Reply Draft (Google Mail)",
    type: "create-reply-draft-google-mail",
    description: "Create a draft reply to an email using Google Mail API",
    tags: ["Social", "Email", "Google", "Draft", "Reply"],
    icon: "mail",
    documentation:
      "This node creates a draft reply to an email using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
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
        description: "Message ID to reply to",
        required: true,
      },
      {
        name: "threadId",
        type: "string",
        description: "Thread ID of the conversation",
        required: true,
      },
      {
        name: "body",
        type: "string",
        description: "Reply body (plain text or HTML)",
        required: true,
      },
      {
        name: "replyAll",
        type: "boolean",
        description: "Reply to all recipients (default: false)",
        required: false,
        value: false,
      },
    ],
    outputs: [
      {
        name: "draftId",
        type: "string",
        description: "Draft ID",
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
      const {
        integrationId,
        messageId,
        threadId,
        body,
        replyAll = false,
      } = context.inputs;
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

      if (!threadId || typeof threadId !== "string") {
        return this.createErrorResult("Thread ID is required");
      }

      if (!body || typeof body !== "string") {
        return this.createErrorResult("Reply body is required");
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

      // First, fetch the original message to get headers for reply
      const originalMessageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!originalMessageResponse.ok) {
        const errorData = await originalMessageResponse.text();
        return this.createErrorResult(
          `Failed to fetch original message: ${errorData}`
        );
      }

      const originalMessage = (await originalMessageResponse.json()) as {
        payload: {
          headers: Array<{ name: string; value: string }>;
        };
      };

      const headers = originalMessage.payload.headers;
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
          ?.value || "";

      const fromHeader = getHeader("from");
      const toHeader = getHeader("to");
      const ccHeader = getHeader("cc");
      const subjectHeader = getHeader("subject");
      const messageIdHeader = getHeader("message-id");

      // Build reply headers
      const replyTo = fromHeader;
      const replyToList = replyTo;
      let replyCc = "";

      if (replyAll) {
        // Include original To and Cc recipients (excluding self)
        const allRecipients = [toHeader, ccHeader].filter(Boolean).join(", ");
        if (allRecipients) {
          replyCc = allRecipients;
        }
      }

      const replySubject = subjectHeader.startsWith("Re: ")
        ? subjectHeader
        : `Re: ${subjectHeader}`;

      // Create RFC 2822 formatted reply email
      const emailLines = [
        `To: ${replyToList}`,
        replyCc ? `Cc: ${replyCc}` : null,
        `Subject: ${replySubject}`,
        messageIdHeader ? `In-Reply-To: ${messageIdHeader}` : null,
        messageIdHeader ? `References: ${messageIdHeader}` : null,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        body,
      ].filter((line) => line !== null);

      const email = emailLines.join("\r\n");

      // Encode email as base64url
      const encodedEmail = btoa(email)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Create draft via Gmail API
      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              raw: encodedEmail,
              threadId: threadId,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to create draft via Gmail API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        message: {
          id: string;
          threadId: string;
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
          : "Unknown error creating draft reply via Gmail"
      );
    }
  }
}
