import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus: string;
    displayName?: string;
  }>;
  htmlLink: string;
  status: string;
}

/**
 * Google Calendar List Events node implementation
 * Lists upcoming events using Google Calendar API with OAuth integration
 */
export class ListEventsGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-events-google-calendar",
    name: "List Events (Google Calendar)",
    type: "list-events-google-calendar",
    description: "List upcoming events using Google Calendar API",
    tags: ["Calendar", "Google"],
    icon: "calendar",
    documentation:
      "This node lists upcoming calendar events using Google Calendar API. Requires a connected Google Calendar integration from your organization's integrations.",
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
        name: "maxResults",
        type: "number",
        description: "Maximum number of events to return (1-250, default: 10)",
        required: false,
        value: 10,
      },
      {
        name: "timeMin",
        type: "string",
        description: "Start date-time (ISO 8601, optional, defaults to now)",
        required: false,
      },
      {
        name: "timeMax",
        type: "string",
        description: "End date-time (ISO 8601, optional)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "events",
        type: "json",
        description: "Array of calendar events",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of events returned",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, maxResults = 10, timeMin, timeMax } = context.inputs;
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

      // Validate maxResults
      const numResults = typeof maxResults === "number" ? maxResults : 10;
      if (numResults < 1 || numResults > 250) {
        return this.createErrorResult("maxResults must be between 1 and 250");
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

      // Build query parameters
      const url = new URL(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events"
      );
      url.searchParams.append("maxResults", numResults.toString());
      url.searchParams.append("orderBy", "startTime");
      url.searchParams.append("singleEvents", "true");

      // Default to now if timeMin not specified
      const minTime =
        timeMin && typeof timeMin === "string"
          ? timeMin
          : new Date().toISOString();
      url.searchParams.append("timeMin", minTime);

      if (timeMax && typeof timeMax === "string") {
        url.searchParams.append("timeMax", timeMax);
      }

      // List events via Google Calendar API
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to list events via Google Calendar API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        items?: CalendarEvent[];
      };

      if (!data.items || data.items.length === 0) {
        return this.createSuccessResult({
          events: [],
          count: 0,
        });
      }

      // Transform events
      const transformedEvents = data.items.map((event) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        startTimeZone: event.start.timeZone,
        endTimeZone: event.end.timeZone,
        attendees: event.attendees?.map((a) => ({
          email: a.email,
          name: a.displayName,
          status: a.responseStatus,
        })),
        htmlLink: event.htmlLink,
        status: event.status,
      }));

      return this.createSuccessResult({
        events: transformedEvents,
        count: transformedEvents.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing events via Google Calendar"
      );
    }
  }
}
