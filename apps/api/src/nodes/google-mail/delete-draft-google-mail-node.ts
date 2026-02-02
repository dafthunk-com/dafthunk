import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Gmail Delete Draft node implementation
 * Deletes a draft using Google Mail API with OAuth integration
 */
export class DeleteDraftGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "delete-draft-google-mail",
    name: "Delete Draft (Google Mail)",
    type: "delete-draft-google-mail",
    description: "Delete a draft using Google Mail API",
    tags: ["Social", "Email", "Google", "Draft", "Delete"],
    icon: "mail",
    documentation:
      "This node deletes a draft using Google Mail API. Requires a connected Google Mail integration from your organization's integrations.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Google Mail integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "draftId",
        type: "string",
        description: "Draft ID to delete",
        required: true,
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
      const { integrationId, draftId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Mail integration."
        );
      }

      if (!draftId || typeof draftId !== "string") {
        return this.createErrorResult("Draft ID is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // Delete draft via Gmail API
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to delete draft via Gmail API: ${errorData}`
        );
      }

      return this.createSuccessResult({
        success: true,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error deleting draft via Gmail"
      );
    }
  }
}
