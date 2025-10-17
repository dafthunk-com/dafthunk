import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Google Calendar Delete Event node implementation
 * Deletes a calendar event using Google Calendar API with OAuth integration
 */
export class DeleteEventGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "delete-event-google-calendar",
    name: "Delete Event (Google Calendar)",
    type: "delete-event-google-calendar",
    description: "Delete a calendar event using Google Calendar API",
    tags: ["Calendar", "Google"],
    icon: "calendar",
    documentation:
      "This node deletes a calendar event using Google Calendar API. Requires a connected Google Calendar integration from your organization's integrations.",
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
        name: "eventId",
        type: "string",
        description: "Event ID to delete",
        required: true,
      },
      {
        name: "sendUpdates",
        type: "boolean",
        description: "Send cancellation notifications to attendees",
        required: false,
        value: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether deletion was successful",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, eventId, sendUpdates = true } = context.inputs;
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

      // Build URL with sendUpdates parameter
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`
      );
      url.searchParams.append(
        "sendUpdates",
        sendUpdates === true ? "all" : "none"
      );

      // Delete event via Google Calendar API
      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to delete event via Google Calendar API: ${errorData}`
        );
      }

      return this.createSuccessResult({
        success: true,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error deleting event via Google Calendar"
      );
    }
  }
}
