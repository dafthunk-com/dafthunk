import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  primary?: boolean;
  accessRole: string;
}

/**
 * Google Calendar List Calendars node implementation
 * Lists available calendars using Google Calendar API with OAuth integration
 */
export class ListCalendarsGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-calendars-google-calendar",
    name: "List Calendars (Google Calendar)",
    type: "list-calendars-google-calendar",
    description: "List available calendars using Google Calendar API",
    tags: ["Calendar", "Google"],
    icon: "calendar",
    documentation:
      "This node lists all calendars available to the user using Google Calendar API. Requires a connected Google Calendar integration from your organization's integrations.",
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
    ],
    outputs: [
      {
        name: "calendars",
        type: "json",
        description: "Array of available calendars",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of calendars",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Calendar integration."
        );
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

      // List calendars via Google Calendar API
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
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
          `Failed to list calendars via Google Calendar API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        items?: Calendar[];
      };

      if (!data.items || data.items.length === 0) {
        return this.createSuccessResult({
          calendars: [],
          count: 0,
        });
      }

      // Transform calendars
      const transformedCalendars = data.items.map((calendar) => ({
        id: calendar.id,
        name: calendar.summary,
        description: calendar.description,
        timeZone: calendar.timeZone,
        isPrimary: calendar.primary || false,
        accessRole: calendar.accessRole,
      }));

      return this.createSuccessResult({
        calendars: transformedCalendars,
        count: transformedCalendars.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing calendars via Google Calendar"
      );
    }
  }
}
