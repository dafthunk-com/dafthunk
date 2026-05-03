import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

interface WordPressPost {
  id: number;
  date: string;
  modified: string;
  status: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  author: number;
}

/**
 * WordPress Get Post node — fetch a single post by ID.
 */
export class GetPostWordPressNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-post-wordpress",
    name: "Get Post (WordPress)",
    type: "get-post-wordpress",
    description: "Get a single WordPress.com post by ID",
    tags: ["CMS", "WordPress", "Post", "Get"],
    icon: "file-text",
    documentation:
      "Retrieves a single WordPress.com post by ID. Defaults to the user's primary blog when `site` is not provided.",
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
        description: "Post ID",
        required: true,
      },
    ],
    outputs: [
      { name: "id", type: "number", description: "Post ID", hidden: false },
      {
        name: "title",
        type: "string",
        description: "Rendered title",
        hidden: false,
      },
      {
        name: "content",
        type: "string",
        description: "Rendered HTML content",
        hidden: false,
      },
      {
        name: "excerpt",
        type: "string",
        description: "Rendered excerpt",
        hidden: false,
      },
      {
        name: "status",
        type: "string",
        description: "Post status",
        hidden: false,
      },
      {
        name: "link",
        type: "string",
        description: "Public URL",
        hidden: false,
      },
      {
        name: "author",
        type: "number",
        description: "Author user ID",
        hidden: true,
      },
      {
        name: "date",
        type: "string",
        description: "Publish date (ISO 8601)",
        hidden: true,
      },
      {
        name: "modified",
        type: "string",
        description: "Last modified date (ISO 8601)",
        hidden: true,
      },
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
      const { integrationId, site, postId } = context.inputs as {
        integrationId?: string;
        site?: string;
        postId?: number;
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

      const url = wordPressApiUrl(resolvedSite, `posts/${postId}`);
      const response = await fetch(url, {
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

      const post = (await response.json()) as WordPressPost;
      return this.createSuccessResult({
        id: post.id,
        title: post.title?.rendered ?? "",
        content: post.content?.rendered ?? "",
        excerpt: post.excerpt?.rendered ?? "",
        status: post.status,
        link: post.link,
        author: post.author,
        date: post.date,
        modified: post.modified,
        post,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error fetching WordPress post"
      );
    }
  }
}
