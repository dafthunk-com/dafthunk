import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

interface WordPressPost {
  id: number;
  link: string;
  status: string;
}

/**
 * WordPress Update Post node — update fields on an existing post.
 *
 * Only fields supplied as inputs are sent to the API; omitted fields are left
 * untouched on the post.
 */
export class UpdatePostWordPressNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "update-post-wordpress",
    name: "Update Post (WordPress)",
    type: "update-post-wordpress",
    description: "Update an existing WordPress.com post",
    tags: ["CMS", "WordPress", "Post", "Update"],
    icon: "file-edit",
    documentation:
      "Updates an existing WordPress.com post. Only inputs you supply are sent. Useful for transitioning a draft to published (set `status` to `publish`).",
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
        description: "Post ID to update",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "New title",
        required: false,
      },
      {
        name: "content",
        type: "string",
        description: "New content",
        required: false,
      },
      {
        name: "status",
        type: "string",
        description: "publish, draft, pending, private, or future",
        required: false,
      },
      {
        name: "excerpt",
        type: "string",
        description: "New excerpt",
        required: false,
      },
    ],
    outputs: [
      { name: "id", type: "number", description: "Post ID" },
      { name: "link", type: "string", description: "Public URL of the post" },
      { name: "status", type: "string", description: "Post status" },
      {
        name: "post",
        type: "json",
        description: "Full post data",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, site, postId, title, content, status, excerpt } =
        context.inputs as {
          integrationId?: string;
          site?: string;
          postId?: number;
          title?: string;
          content?: string;
          status?: string;
          excerpt?: string;
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

      const body: Record<string, unknown> = {};
      if (title !== undefined) body.title = title;
      if (content !== undefined) body.content = content;
      if (status !== undefined) body.status = status;
      if (excerpt !== undefined) body.excerpt = excerpt;

      if (Object.keys(body).length === 0) {
        return this.createErrorResult(
          "Provide at least one field to update (title, content, status, or excerpt)."
        );
      }

      const response = await fetch(
        wordPressApiUrl(resolvedSite, `posts/${postId}`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${integration.token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return this.createErrorResult(
          `WordPress API error (${response.status}): ${errorText}`
        );
      }

      const post = (await response.json()) as WordPressPost;
      return this.createSuccessResult({
        id: post.id,
        link: post.link,
        status: post.status,
        post,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error updating WordPress post"
      );
    }
  }
}
