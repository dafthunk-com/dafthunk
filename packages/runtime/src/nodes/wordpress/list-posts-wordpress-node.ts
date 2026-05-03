import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

/**
 * WordPress List Posts node — paginated list of posts on a site.
 */
export class ListPostsWordPressNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-posts-wordpress",
    name: "List Posts (WordPress)",
    type: "list-posts-wordpress",
    description: "List posts from a WordPress.com site",
    tags: ["CMS", "WordPress", "Post", "List"],
    icon: "list",
    documentation:
      "Lists posts on the connected WordPress.com site. Defaults to the user's primary blog when `site` is not provided.",
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
        name: "status",
        type: "string",
        description:
          "Filter by status: publish, draft, pending, private, future, any",
        required: false,
      },
      {
        name: "search",
        type: "string",
        description: "Search keyword",
        required: false,
      },
      {
        name: "perPage",
        type: "number",
        description: "Results per page (1-100, default 10)",
        required: false,
      },
      {
        name: "page",
        type: "number",
        description: "Page number (default 1)",
        required: false,
      },
      {
        name: "categories",
        type: "string",
        description: "Comma-separated category IDs",
        required: false,
      },
    ],
    outputs: [
      {
        name: "posts",
        type: "json",
        description: "Array of posts",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of posts returned",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, site, status, search, perPage, page, categories } =
        context.inputs as {
          integrationId?: string;
          site?: string;
          status?: string;
          search?: string;
          perPage?: number;
          page?: number;
          categories?: string;
        };

      if (!integrationId) {
        return this.createErrorResult(
          "Integration ID is required. Please select a WordPress integration."
        );
      }

      const integration = await context.getIntegration(integrationId);
      const resolvedSite = resolveWordPressSite(integration, site);
      if (!resolvedSite) {
        return this.createErrorResult(
          "Unable to determine WordPress site. Pass `site` (host or blog ID) or reconnect the integration."
        );
      }

      const url = wordPressApiUrl(resolvedSite, "posts", {
        status,
        search,
        per_page: perPage ?? 10,
        page: page ?? 1,
        categories,
      });

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

      const posts = (await response.json()) as unknown[];
      return this.createSuccessResult({
        posts,
        count: posts.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing WordPress posts"
      );
    }
  }
}
