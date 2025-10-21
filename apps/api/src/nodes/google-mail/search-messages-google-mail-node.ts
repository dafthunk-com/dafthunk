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
 * Gmail Search Messages node implementation
 * Searches messages using Google Mail API query syntax with OAuth integration
 */
export class SearchMessagesGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "search-messages-google-mail",
    name: "Search Messages (Google Mail)",
    type: "search-messages-google-mail",
    description: "Search messages using Gmail query syntax",
    tags: ["Social", "Email", "Google", "Search"],
    icon: "mail",
    documentation:
      "This node searches messages using Google Mail API query syntax (e.g., 'from:user@example.com subject:report'). Requires a connected Google Mail integration from your organization's integrations.",
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
        name: "query",
        type: "string",
        description:
          "Gmail search query (e.g., 'from:user@example.com is:unread')",
        required: true,
      },
      {
        name: "maxResults",
        type: "number",
        description: "Number of messages to retrieve (1-100, default: 10)",
        required: false,
        value: 10,
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
        name: "messages",
        type: "json",
        description: "Array of matching email messages",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of messages found",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        integrationId,
        query,
        maxResults = 10,
        includeBody = false,
      } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Mail integration."
        );
      }

      if (!query || typeof query !== "string") {
        return this.createErrorResult("Search query is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Validate maxResults
      const numResults = typeof maxResults === "number" ? maxResults : 10;
      if (numResults < 1 || numResults > 100) {
        return this.createErrorResult("maxResults must be between 1 and 100");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Search messages via Gmail API
      const searchUrl = new URL(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages"
      );
      searchUrl.searchParams.append("q", query);
      searchUrl.searchParams.append("maxResults", numResults.toString());

      const listResponse = await fetch(searchUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!listResponse.ok) {
        const errorData = await listResponse.text();
        return this.createErrorResult(
          `Failed to search messages via Gmail API: ${errorData}`
        );
      }

      const listData = (await listResponse.json()) as {
        messages?: Array<{ id: string; threadId: string }>;
      };

      if (!listData.messages || listData.messages.length === 0) {
        return this.createSuccessResult({
          messages: [],
          count: 0,
        });
      }

      // Fetch full message details
      const messages = await Promise.all(
        listData.messages.map(async (msg) => {
          const format = includeBody ? "full" : "metadata";
          const response = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=${format}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch message ${msg.id}`);
          }

          return (await response.json()) as GmailMessage;
        })
      );

      // Transform messages into a more usable format
      const transformedMessages = messages.map((msg) => {
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

        return {
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
      });

      return this.createSuccessResult({
        messages: transformedMessages,
        count: transformedMessages.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error searching messages via Gmail"
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
