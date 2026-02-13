import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

interface GmailDraft {
  id: string;
  message: {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
  };
}

/**
 * Gmail Check Draft node implementation
 * Checks if a draft exists for a thread or message using Google Mail API with OAuth integration
 */
export class CheckDraftGoogleMailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "check-draft-google-mail",
    name: "Check Draft (Google Mail)",
    type: "check-draft-google-mail",
    description: "Check if a draft exists for a thread or message",
    tags: ["Social", "Email", "Google", "Draft", "Check"],
    icon: "mail",
    documentation:
      "This node checks if drafts exist in Gmail. Can check by thread ID or search all drafts. Requires a connected Google Mail integration from your organization's integrations.",
    usage: 10,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "google-mail",
        description: "Google Mail integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "threadId",
        type: "string",
        description: "Thread ID to check for drafts (optional)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "hasDraft",
        type: "boolean",
        description: "Whether a draft exists",
        hidden: false,
      },
      {
        name: "drafts",
        type: "json",
        description: "Array of draft details",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of drafts found",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, threadId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Google Mail integration."
        );
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      const accessToken = integration.token;

      // List drafts, optionally filtered by thread
      const url = new URL(
        "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
      );
      if (threadId && typeof threadId === "string") {
        url.searchParams.append("q", `in:drafts`);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to list drafts via Gmail API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        drafts?: GmailDraft[];
      };

      if (!data.drafts || data.drafts.length === 0) {
        return this.createSuccessResult({
          hasDraft: false,
          drafts: [],
          count: 0,
        });
      }

      // Filter by threadId if provided
      let filteredDrafts = data.drafts;
      if (threadId && typeof threadId === "string") {
        filteredDrafts = data.drafts.filter(
          (draft) => draft.message.threadId === threadId
        );
      }

      // Transform drafts into a more usable format
      const transformedDrafts = filteredDrafts.map((draft) => ({
        draftId: draft.id,
        messageId: draft.message.id,
        threadId: draft.message.threadId,
        snippet: draft.message.snippet,
        labels: draft.message.labelIds,
      }));

      return this.createSuccessResult({
        hasDraft: transformedDrafts.length > 0,
        drafts: transformedDrafts,
        count: transformedDrafts.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error checking drafts via Gmail"
      );
    }
  }
}
