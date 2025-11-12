import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Microsoft Teams List Channels node implementation
 * Lists channels in a Microsoft Team
 */
export class ListChannelsTeamsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-channels-teams",
    name: "List Channels (Teams)",
    type: "list-channels-teams",
    description: "List channels in a Microsoft Team",
    tags: ["Communication", "Microsoft Teams", "List"],
    icon: "list",
    documentation:
      "This node retrieves a list of channels in a specific Microsoft Team. Requires a connected Microsoft Teams integration.",
    computeCost: 5,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Microsoft Teams integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "teamId",
        type: "string",
        description: "Microsoft Teams team ID",
        required: true,
      },
    ],
    outputs: [
      {
        name: "channels",
        type: "json",
        description:
          "Array of channels with id, displayName, description, and membershipType",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of channels returned",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, teamId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Microsoft Teams integration."
        );
      }

      if (!teamId || typeof teamId !== "string") {
        return this.createErrorResult("Team ID is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Get channels via Microsoft Graph API
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to list channels via Microsoft Graph API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        value: Array<{
          id: string;
          displayName: string;
          description: string;
          membershipType: string;
          isArchived: boolean;
        }>;
      };

      return this.createSuccessResult({
        channels: data.value,
        count: data.value.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing channels via Microsoft Teams"
      );
    }
  }
}
