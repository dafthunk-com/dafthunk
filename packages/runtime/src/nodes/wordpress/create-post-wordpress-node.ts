import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

interface WordPressPost {
  id: number;
  link: string;
  status: string;
}

/**
 * WordPress Create Post node — create a new post on a site.
 */
export class CreatePostWordPressNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "create-post-wordpress",
    name: "Create Post (WordPress)",
    type: "create-post-wordpress",
    description: "Create a new WordPress.com post",
    tags: ["CMS", "WordPress", "Post", "Create"],
    icon: "file-plus",
    documentation:
      "Creates a new post on the connected WordPress.com site. Defaults to the user's primary blog when `site` is not provided. Defaults to status `draft`.",
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
        name: "title",
        type: "string",
        description: "Post title",
        required: true,
      },
      {
        name: "content",
        type: "string",
        description: "Post content (HTML or plain text)",
        required: true,
      },
      {
        name: "status",
        type: "string",
        description:
          "publish, draft, pending, private, or future (default: draft)",
        required: false,
      },
      {
        name: "excerpt",
        type: "string",
        description: "Optional excerpt",
        required: false,
      },
      {
        name: "categories",
        type: "string",
        description: "Comma-separated category IDs",
        required: false,
      },
      {
        name: "tags",
        type: "string",
        description: "Comma-separated tag IDs",
        required: false,
      },
    ],
    outputs: [
      { name: "id", type: "number", description: "Created post ID" },
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
      const {
        integrationId,
        site,
        title,
        content,
        status,
        excerpt,
        categories,
        tags,
      } = context.inputs as {
        integrationId?: string;
        site?: string;
        title?: string;
        content?: string;
        status?: string;
        excerpt?: string;
        categories?: string;
        tags?: string;
      };

      if (!integrationId) {
        return this.createErrorResult(
          "Integration ID is required. Please select a WordPress integration."
        );
      }
      if (!title) {
        return this.createErrorResult("Title is required");
      }
      if (content === undefined) {
        return this.createErrorResult("Content is required");
      }

      const integration = await context.getIntegration(integrationId);
      const resolvedSite = resolveWordPressSite(integration, site);
      if (!resolvedSite) {
        return this.createErrorResult(
          "Unable to determine WordPress site. Pass `site` (host or blog ID) or reconnect the integration."
        );
      }

      const body: Record<string, unknown> = {
        title,
        content,
        status: status ?? "draft",
      };
      if (excerpt) body.excerpt = excerpt;
      if (categories) {
        body.categories = categories
          .split(",")
          .map((c) => Number(c.trim()))
          .filter((n) => Number.isFinite(n));
      }
      if (tags) {
        body.tags = tags
          .split(",")
          .map((t) => Number(t.trim()))
          .filter((n) => Number.isFinite(n));
      }

      const response = await fetch(wordPressApiUrl(resolvedSite, "posts"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

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
          : "Unknown error creating WordPress post"
      );
    }
  }
}
