import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Google Calendar Quick Add node implementation
 * Creates events from natural language text using Google Calendar API with OAuth integration
 */
export class QuickAddGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "quick-add-google-calendar",
    name: "Quick Add (Google Calendar)",
    type: "quick-add-google-calendar",
    description:
      "Create events from natural language using Google Calendar API",
    tags: ["Social", "Calendar", "Google", "Event", "Add"],
    icon: "calendar",
    documentation:
      "This node creates calendar events from natural language text (e.g., 'Dinner with John tomorrow at 7pm') using Google Calendar API. Requires a connected Google Calendar integration from your organization's integrations.",
    computeCost: 10,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Google Calendar integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "text",
        type: "string",
        description:
          "Natural language event description (e.g., 'Meeting tomorrow at 3pm')",
        required: true,
      },
    ],
    outputs: [
      {
        name: "eventId",
        type: "string",
        description: "Created event ID",
        hidden: false,
      },
      {
        name: "htmlLink",
        type: "string",
        description: "Event URL",
        hidden: false,
      },
      {
        name: "summary",
        type: "string",
        description: "Parsed event summary",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, text } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Calendar integration."
        );
      }

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Event text is required");
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

      if (integration.provider !== "google-calendar") {
        return this.createErrorResult(
          "Invalid integration type. This node requires a Google Calendar integration."
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

      // Quick add event via Google Calendar API
      const url = new URL(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events/quickAdd"
      );
      url.searchParams.append("text", text);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to quick add event via Google Calendar API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        htmlLink: string;
        summary: string;
      };

      return this.createSuccessResult({
        eventId: data.id,
        htmlLink: data.htmlLink,
        summary: data.summary,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error quick adding event via Google Calendar"
      );
    }
  }
}
