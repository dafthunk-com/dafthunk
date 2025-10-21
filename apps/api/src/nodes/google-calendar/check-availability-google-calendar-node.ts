import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Google Calendar Check Availability node implementation
 * Checks free/busy status for time slots using Google Calendar API with OAuth integration
 */
export class CheckAvailabilityGoogleCalendarNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "check-availability-google-calendar",
    name: "Check Availability (Google Calendar)",
    type: "check-availability-google-calendar",
    description:
      "Check free/busy status for time slots using Google Calendar API",
    tags: ["Social", "Calendar", "Google", "Availability"],
    icon: "calendar",
    documentation:
      "This node checks if time slots are free or busy using Google Calendar API. Requires a connected Google Calendar integration from your organization's integrations.",
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
        name: "timeMin",
        type: "string",
        description: "Start of time range (ISO 8601 format)",
        required: true,
      },
      {
        name: "timeMax",
        type: "string",
        description: "End of time range (ISO 8601 format)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "isFree",
        type: "boolean",
        description: "Whether the time slot is completely free",
        hidden: false,
      },
      {
        name: "busySlots",
        type: "json",
        description: "Array of busy time slots",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, timeMin, timeMax } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Calendar integration."
        );
      }

      if (!timeMin || typeof timeMin !== "string") {
        return this.createErrorResult("Start time (timeMin) is required");
      }

      if (!timeMax || typeof timeMax !== "string") {
        return this.createErrorResult("End time (timeMax) is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      if (integration.provider !== "google-calendar") {
        return this.createErrorResult(
          "Invalid integration type. This node requires a Google Calendar integration."
        );
      }

      const accessToken = integration.token;

      // Check freebusy via Google Calendar API
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/freeBusy",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeMin,
            timeMax,
            items: [{ id: "primary" }],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to check availability via Google Calendar API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        calendars: {
          primary: {
            busy: Array<{ start: string; end: string }>;
          };
        };
      };

      const busySlots = data.calendars.primary.busy || [];
      const isFree = busySlots.length === 0;

      return this.createSuccessResult({
        isFree,
        busySlots: busySlots.map((slot) => ({
          start: slot.start,
          end: slot.end,
        })),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error checking availability via Google Calendar"
      );
    }
  }
}
