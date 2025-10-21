import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

/**
 * Reddit Submit Comment node implementation
 * Submits a comment on a Reddit post or another comment
 */
export class SubmitCommentRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "submit-comment-reddit",
    name: "Submit Comment (Reddit)",
    type: "submit-comment-reddit",
    description: "Submit a comment on a Reddit post or reply to a comment",
    tags: ["Social", "Reddit", "Comment", "Submit"],
    icon: "message-circle",
    documentation:
      "This node submits a comment on a Reddit post or replies to an existing comment. Requires a connected Reddit integration.",
    computeCost: 10,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Reddit integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "parentId",
        type: "string",
        description:
          "Full name of parent (post or comment, e.g., t3_abc123 or t1_def456)",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Comment text (supports Markdown)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Comment ID",
        hidden: false,
      },
      {
        name: "name",
        type: "string",
        description: "Comment full name (t1_ + id)",
        hidden: true,
      },
      {
        name: "permalink",
        type: "string",
        description: "Comment permalink",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, parentId, text } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Reddit integration."
        );
      }

      if (!parentId || typeof parentId !== "string") {
        return this.createErrorResult("Parent ID is required");
      }

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Comment text is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);

      if (integration.provider !== "reddit") {
        return this.createErrorResult(
          "Invalid integration type. This node requires a Reddit integration."
        );
      }

      const accessToken = integration.token;

      // Prepare form data for comment submission
      const formData = new URLSearchParams({
        api_type: "json",
        thing_id: parentId,
        text,
      });

      // Submit comment via Reddit API
      const response = await fetch("https://oauth.reddit.com/api/comment", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Dafthunk/1.0",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to submit comment via Reddit API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        json: {
          errors: any[];
          data?: {
            things: Array<{
              data: {
                id: string;
                name: string;
                permalink?: string;
              };
            }>;
          };
        };
      };

      if (result.json.errors && result.json.errors.length > 0) {
        return this.createErrorResult(
          `Reddit API error: ${JSON.stringify(result.json.errors)}`
        );
      }

      if (
        !result.json.data ||
        !result.json.data.things ||
        result.json.data.things.length === 0
      ) {
        return this.createErrorResult("No data returned from Reddit API");
      }

      const comment = result.json.data.things[0].data;

      return this.createSuccessResult({
        id: comment.id,
        name: comment.name,
        permalink: comment.permalink,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error submitting comment to Reddit"
      );
    }
  }
}
