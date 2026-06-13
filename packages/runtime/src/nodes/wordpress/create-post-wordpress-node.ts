import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";
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
  private static readonly inputSchema = z.object({
    integrationId: z
      .string({
        error:
          "Integration ID is required. Please select a WordPress integration.",
      })
      .min(1, {
        error:
          "Integration ID is required. Please select a WordPress integration.",
      }),
    site: z.string().optional(),
    title: z
      .string({ error: "Title is required" })
      .min(1, { error: "Title is required" }),
    // Empty content is allowed, only `undefined` is rejected
    content: z.string({ error: "Content is required" }),
    status: z.string().optional(),
    excerpt: z.string().optional(),
    categories: z.string().optional(),
    tags: z.string().optional(),
  });

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
      const parsed = CreatePostWordPressNode.inputSchema.safeParse(
        context.inputs
      );
      if (!parsed.success) {
        return this.createErrorResult(zodErrorMessage(parsed.error));
      }
      const {
        integrationId,
        site,
        title,
        content,
        status,
        excerpt,
        categories,
        tags,
      } = parsed.data;

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
