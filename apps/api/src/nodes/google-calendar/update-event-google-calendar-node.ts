import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Google Calendar Update Event node implementation
 * Updates an existing calendar event using Google Calendar API with OAuth integration
 */
export class UpdateEventGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "update-event-google-calendar",
    name: "Update Event (Google Calendar)",
    type: "update-event-google-calendar",
    description: "Update an existing calendar event using Google Calendar API",
    tags: ["Social", "Calendar", "Google", "Event", "Update"],
    icon: "calendar",
    documentation:
      "This node updates an existing calendar event using Google Calendar API. Requires a connected Google Calendar integration from your organization's integrations.",
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
        name: "eventId",
        type: "string",
        description: "Event ID to update",
        required: true,
      },
      {
        name: "summary",
        type: "string",
        description: "Event title/summary (optional)",
        required: false,
      },
      {
        name: "startDateTime",
        type: "date",
        description: "Start date-time",
        required: false,
      },
      {
        name: "endDateTime",
        type: "date",
        description: "End date-time",
        required: false,
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
    ],
    outputs: [
      {
        name: "eventId",
        type: "string",
        description: "Updated event ID",
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
        eventId,
        summary,
        startDateTime,
        endDateTime,
        description,
        location,
      } = context.inputs;
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

      // First, get the existing event
      const getResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!getResponse.ok) {
        const errorData = await getResponse.text();
        return this.createErrorResult(
          `Failed to get existing event: ${errorData}`
        );
      }

      const existingEvent = (await getResponse.json()) as {
        start: { timeZone?: string; [key: string]: unknown };
        end: { timeZone?: string; [key: string]: unknown };
        [key: string]: unknown;
      };

      // Build update object with only provided fields
      const updates: Record<string, unknown> = { ...existingEvent };

      if (summary && typeof summary === "string") {
        updates.summary = summary;
      }

      if (startDateTime && typeof startDateTime === "string") {
        updates.start = {
          dateTime: startDateTime,
          timeZone: existingEvent.start.timeZone || "UTC",
        };
      }

      if (endDateTime && typeof endDateTime === "string") {
        updates.end = {
          dateTime: endDateTime,
          timeZone: existingEvent.end.timeZone || "UTC",
        };
      }

      if (description && typeof description === "string") {
        updates.description = description;
      }

      if (location && typeof location === "string") {
        updates.location = location;
      }

      // Update event via Google Calendar API
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to update event via Google Calendar API: ${errorData}`
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
          : "Unknown error updating event via Google Calendar"
      );
    }
  }
}
