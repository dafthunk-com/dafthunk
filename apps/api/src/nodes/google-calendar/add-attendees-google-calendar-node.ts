import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

/**
 * Google Calendar Add Attendees node implementation
 * Adds attendees to an existing event using Google Calendar API with OAuth integration
 */
export class AddAttendeesGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "add-attendees-google-calendar",
    name: "Add Attendees (Google Calendar)",
    type: "add-attendees-google-calendar",
    description: "Add attendees to an existing event using Google Calendar API",
    tags: ["Social", "Calendar", "Google", "Attendee", "Add"],
    icon: "calendar",
    documentation:
      "This node adds attendees to an existing calendar event using Google Calendar API. Requires a connected Google Calendar integration from your organization's integrations.",
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
        description: "Event ID to add attendees to",
        required: true,
      },
      {
        name: "attendees",
        type: "string",
        description: "Comma-separated list of attendee emails to add",
        required: true,
      },
      {
        name: "sendUpdates",
        type: "boolean",
        description: "Send invitation emails to new attendees",
        required: false,
        value: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether attendees were added successfully",
        hidden: false,
      },
      {
        name: "eventId",
        type: "string",
        description: "Event ID",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        integrationId,
        eventId,
        attendees,
        sendUpdates = true,
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

      if (!attendees || typeof attendees !== "string") {
        return this.createErrorResult("Attendees list is required");
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
        attendees?: Array<{ email: string }>;
        [key: string]: unknown;
      };

      // Parse new attendees
      const newAttendees = attendees
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
        .map((email) => ({ email }));

      // Merge with existing attendees (avoid duplicates)
      const existingAttendees = existingEvent.attendees || [];
      const existingEmails = new Set(
        existingAttendees.map((a: { email: string }) => a.email)
      );

      const uniqueNewAttendees = newAttendees.filter(
        (a) => !existingEmails.has(a.email)
      );

      if (uniqueNewAttendees.length === 0) {
        return this.createSuccessResult({
          success: true,
          eventId: eventId,
        });
      }

      const updatedAttendees = [...existingAttendees, ...uniqueNewAttendees];

      // Build URL with sendUpdates parameter
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`
      );
      url.searchParams.append(
        "sendUpdates",
        sendUpdates === true ? "all" : "none"
      );

      // Update event with new attendees
      const response = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...existingEvent,
          attendees: updatedAttendees,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to add attendees via Google Calendar API: ${errorData}`
        );
      }

      return this.createSuccessResult({
        success: true,
        eventId: eventId,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error adding attendees via Google Calendar"
      );
    }
  }
}
