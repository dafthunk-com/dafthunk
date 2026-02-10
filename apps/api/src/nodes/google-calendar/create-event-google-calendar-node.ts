import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Google Calendar Create Event node implementation
 * Creates a new calendar event using Google Calendar API with OAuth integration
 */
export class CreateEventGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "create-event-google-calendar",
    name: "Create Event (Google Calendar)",
    type: "create-event-google-calendar",
    description: "Create a new calendar event using Google Calendar API",
    tags: ["Social", "Calendar", "Google", "Event", "Create"],
    icon: "calendar",
    documentation:
      "This node creates a new calendar event using Google Calendar API. Requires a connected Google Calendar integration from your organization's integrations.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "google-calendar",
        description: "Google Calendar integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Event title/summary",
        required: true,
      },
      {
        name: "startDateTime",
        type: "date",
        description: "Start date-time",
        required: true,
      },
      {
        name: "endDateTime",
        type: "date",
        description: "End date-time",
        required: true,
      },
      {
        name: "description",
        type: "string",
        description: "Event description (optional)",
        required: false,
      },
      {
        name: "location",
        type: "string",
        description: "Event location (optional)",
        required: false,
      },
      {
        name: "attendees",
        type: "string",
        description: "Comma-separated list of attendee emails (optional)",
        required: false,
      },
      {
        name: "timeZone",
        type: "string",
        description: "Time zone (e.g., 'America/New_York', defaults to UTC)",
        required: false,
        value: "UTC",
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
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        integrationId,
        summary,
        startDateTime,
        endDateTime,
        description,
        location,
        attendees,
        timeZone = "UTC",
      } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Calendar integration."
        );
      }

      if (!summary || typeof summary !== "string") {
        return this.createErrorResult("Event summary is required");
      }

      if (!startDateTime || typeof startDateTime !== "string") {
        return this.createErrorResult("Start date-time is required");
      }

      if (!endDateTime || typeof endDateTime !== "string") {
        return this.createErrorResult("End date-time is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Build event object
      const event: {
        summary: string;
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        description?: string;
        location?: string;
        attendees?: Array<{ email: string }>;
      } = {
        summary,
        start: {
          dateTime: startDateTime,
          timeZone: typeof timeZone === "string" ? timeZone : "UTC",
        },
        end: {
          dateTime: endDateTime,
          timeZone: typeof timeZone === "string" ? timeZone : "UTC",
        },
      };

      if (description && typeof description === "string") {
        event.description = description;
      }

      if (location && typeof location === "string") {
        event.location = location;
      }

      if (attendees && typeof attendees === "string") {
        event.attendees = attendees
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean)
          .map((email) => ({ email }));
      }

      // Create event via Google Calendar API
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to create event via Google Calendar API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        htmlLink: string;
      };

      return this.createSuccessResult({
        eventId: data.id,
        htmlLink: data.htmlLink,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error creating event via Google Calendar"
      );
    }
  }
}
