import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

/**
 * WordPress Delete Post node — trash or permanently delete a post.
 *
 * Default behavior moves the post to the trash; pass `force: true` to
 * permanently delete it (irreversible).
 */
export class DeletePostWordPressNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "delete-post-wordpress",
    name: "Delete Post (WordPress)",
    type: "delete-post-wordpress",
    description: "Delete (trash) or permanently remove a WordPress.com post",
    tags: ["CMS", "WordPress", "Post", "Delete"],
    icon: "trash-2",
    documentation:
      "Deletes a WordPress.com post. By default the post is moved to the trash and can be restored. Pass `force: true` to delete it permanently — this cannot be undone.",
    usage: 10,
    subscription: true,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "wordpress",
        description: "WordPress integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "site",
        type: "string",
        description:
          "Site host or numeric blog ID. Defaults to the integration's primary blog.",
        required: false,
      },
      {
        name: "postId",
        type: "number",
        description: "Post ID to delete",
        required: true,
      },
      {
        name: "force",
        type: "boolean",
        description:
          "Permanently delete instead of moving to trash (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "deleted",
        type: "boolean",
        description: "Whether the post was deleted",
      },
      {
        name: "result",
        type: "json",
        description: "API response payload",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, site, postId, force } = context.inputs as {
        integrationId?: string;
        site?: string;
        postId?: number;
        force?: boolean;
      };

      if (!integrationId) {
        return this.createErrorResult(
          "Integration ID is required. Please select a WordPress integration."
        );
      }
      if (postId === undefined || postId === null) {
        return this.createErrorResult("Post ID is required");
      }

      const integration = await context.getIntegration(integrationId);
      const resolvedSite = resolveWordPressSite(integration, site);
      if (!resolvedSite) {
        return this.createErrorResult(
          "Unable to determine WordPress site. Pass `site` (host or blog ID) or reconnect the integration."
        );
      }

      const url = wordPressApiUrl(resolvedSite, `posts/${postId}`, {
        force: force ? "true" : undefined,
      });

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${integration.token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return this.createErrorResult(
          `WordPress API error (${response.status}): ${errorText}`
        );
      }

      const result = (await response.json()) as { deleted?: boolean };
      return this.createSuccessResult({
        deleted: force ? result.deleted === true : true,
        result,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error deleting WordPress post"
      );
    }
  }
}
