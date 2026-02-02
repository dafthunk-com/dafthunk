import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

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
  created: string;
  updated: string;
}

/**
 * Google Calendar Get Event node implementation
 * Gets a specific event by ID using Google Calendar API with OAuth integration
 */
export class GetEventGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-event-google-calendar",
    name: "Get Event (Google Calendar)",
    type: "get-event-google-calendar",
    description: "Get a specific event by ID using Google Calendar API",
    tags: ["Social", "Calendar", "Google", "Event", "Get"],
    icon: "calendar",
    documentation:
      "This node retrieves a specific calendar event by ID using Google Calendar API. Requires a connected Google Calendar integration from your organization's integrations.",
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
        name: "eventId",
        type: "string",
        description: "Event ID to retrieve",
        required: true,
      },
    ],
    outputs: [
      {
        name: "event",
        type: "json",
        description: "Event details",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, eventId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Calendar integration."
        );
      }

      if (!eventId || typeof eventId !== "string") {
        return this.createErrorResult("Event ID is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get event via Google Calendar API
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
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
          `Failed to get event via Google Calendar API: ${errorData}`
        );
      }

      const event = (await response.json()) as CalendarEvent;

      // Transform event
      const transformedEvent = {
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
        created: event.created,
        updated: event.updated,
      };

      return this.createSuccessResult({
        event: transformedEvent,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting event via Google Calendar"
      );
    }
  }
}
