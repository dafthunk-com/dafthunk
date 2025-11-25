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
 * Google Calendar Search Events node implementation
 * Searches for events using text query with Google Calendar API with OAuth integration
 */
export class SearchEventsGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "search-events-google-calendar",
    name: "Search Events (Google Calendar)",
    type: "search-events-google-calendar",
    description: "Search for events using text query with Google Calendar API",
    tags: ["Social", "Calendar", "Google", "Event", "Search"],
    icon: "calendar",
    documentation:
      "This node searches for calendar events using a text query (searches summary, description, location, attendee names/emails). Requires a connected Google Calendar integration from your organization's integrations.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Google Calendar integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "query",
        type: "string",
        description: "Search query text",
        required: true,
      },
      {
        name: "maxResults",
        type: "number",
        description: "Maximum number of events to return (1-250, default: 10)",
        required: false,
        value: 10,
      },
    ],
    outputs: [
      {
        name: "events",
        type: "json",
        description: "Array of matching calendar events",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of events found",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, query, maxResults = 10 } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Calendar integration."
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
      if (numResults < 1 || numResults > 250) {
        return this.createErrorResult("maxResults must be between 1 and 250");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Build query parameters
      const url = new URL(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events"
      );
      url.searchParams.append("q", query);
      url.searchParams.append("maxResults", numResults.toString());
      url.searchParams.append("singleEvents", "true");

      // Search events via Google Calendar API
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to search events via Google Calendar API: ${errorData}`
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
          : "Unknown error searching events via Google Calendar"
      );
    }
  }
}
