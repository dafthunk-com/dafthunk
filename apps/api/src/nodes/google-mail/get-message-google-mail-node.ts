import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body: {
        data?: string;
      };
    }>;
  };
  internalDate: string;
}

/**
 * Gmail Get Message node implementation
 * Gets a specific message by ID using Google Mail API with OAuth integration
 */
export class GetMessageGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-message-google-mail",
    name: "Get Message (Google Mail)",
    type: "get-message-google-mail",
    description: "Get a specific message by ID using Google Mail API",
    tags: ["Email", "Google"],
    icon: "mail",
    documentation:
      "This node retrieves a specific message by ID using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
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
        description: "Message ID to retrieve",
        required: true,
      },
      {
        name: "includeBody",
        type: "boolean",
        description: "Include full message body (otherwise only snippet)",
        required: false,
        value: false,
      },
    ],
    outputs: [
      {
        name: "message",
        type: "json",
        description: "Message details",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, messageId, includeBody = false } = context.inputs;
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

      // Fetch message via Gmail API
      const format = includeBody ? "full" : "metadata";
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=${format}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to get message via Gmail API: ${errorData}`
        );
      }

      const msg = (await response.json()) as GmailMessage;

      // Transform message into a more usable format
      const headers = msg.payload.headers;
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
          ?.value || "";

      let body = "";
      if (includeBody) {
        // Try to get text/plain body
        if (msg.payload.body.data) {
          body = this.decodeBase64(msg.payload.body.data);
        } else if (msg.payload.parts) {
          const textPart = msg.payload.parts.find(
            (p) => p.mimeType === "text/plain"
          );
          if (textPart?.body.data) {
            body = this.decodeBase64(textPart.body.data);
          } else {
            const htmlPart = msg.payload.parts.find(
              (p) => p.mimeType === "text/html"
            );
            if (htmlPart?.body.data) {
              body = this.decodeBase64(htmlPart.body.data);
            }
          }
        }
      }

      const transformedMessage = {
        id: msg.id,
        threadId: msg.threadId,
        from: getHeader("from"),
        to: getHeader("to"),
        subject: getHeader("subject"),
        date: getHeader("date"),
        snippet: msg.snippet,
        body: includeBody ? body : undefined,
        labels: msg.labelIds,
        timestamp: new Date(parseInt(msg.internalDate)).toISOString(),
      };

      return this.createSuccessResult({
        message: transformedMessage,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting message via Gmail"
      );
    }
  }

  private decodeBase64(data: string): string {
    try {
      // Gmail uses base64url encoding
      const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
      return atob(base64);
    } catch {
      return "";
    }
  }
}
