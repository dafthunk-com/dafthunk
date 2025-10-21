import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Gmail Modify Labels node implementation
 * Adds or removes labels from a message using Google Mail API with OAuth integration
 */
export class ModifyLabelsGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "modify-labels-google-mail",
    name: "Modify Labels (Google Mail)",
    type: "modify-labels-google-mail",
    description: "Add or remove labels from a message using Google Mail API",
    tags: ["Social", "Email", "Google", "Label", "Modify"],
    icon: "mail",
    documentation:
      "This node adds or removes labels from a message using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
    computeCost: 10,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Google Mail integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "messageId",
        type: "string",
        description: "Message ID to modify",
        required: true,
      },
      {
        name: "addLabels",
        type: "string",
        description: "Comma-separated label IDs to add",
        required: false,
      },
      {
        name: "removeLabels",
        type: "string",
        description: "Comma-separated label IDs to remove",
        required: false,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether operation was successful",
        hidden: false,
      },
      {
        name: "labels",
        type: "json",
        description: "Updated label IDs",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, messageId, addLabels, removeLabels } =
        context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Mail integration."
        );
      }

      if (!messageId || typeof messageId !== "string") {
        return this.createErrorResult("Message ID is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Parse label lists
      const addLabelIds: string[] = [];
      const removeLabelIds: string[] = [];

      if (addLabels && typeof addLabels === "string") {
        addLabelIds.push(
          ...addLabels
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
        );
      }

      if (removeLabels && typeof removeLabels === "string") {
        removeLabelIds.push(
          ...removeLabels
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
        );
      }

      if (addLabelIds.length === 0 && removeLabelIds.length === 0) {
        return this.createErrorResult(
          "At least one label must be specified to add or remove"
        );
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Modify message labels via Gmail API
      const requestBody: {
        addLabelIds?: string[];
        removeLabelIds?: string[];
      } = {};

      if (addLabelIds.length > 0) {
        requestBody.addLabelIds = addLabelIds;
      }

      if (removeLabelIds.length > 0) {
        requestBody.removeLabelIds = removeLabelIds;
      }

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to modify labels via Gmail API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        labelIds: string[];
      };

      return this.createSuccessResult({
        success: true,
        labels: data.labelIds,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error modifying labels via Gmail"
      );
    }
  }
}
