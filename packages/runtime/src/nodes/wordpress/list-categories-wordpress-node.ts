import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

/**
 * WordPress List Categories node — list categories on a site.
 */
export class ListCategoriesWordPressNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "list-categories-wordpress",
    name: "List Categories (WordPress)",
    type: "list-categories-wordpress",
    description: "List categories on a WordPress.com site",
    tags: ["CMS", "WordPress", "Category", "List"],
    icon: "tag",
    documentation:
      "Lists categories on the connected WordPress.com site. Useful for resolving category IDs before creating posts.",
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
        name: "search",
        type: "string",
        description: "Search keyword",
        required: false,
      },
      {
        name: "perPage",
        type: "number",
        description: "Results per page (1-100, default 100)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "categories",
        type: "json",
        description: "Array of categories",
        hidden: false,
      },
      {
        name: "count",
        type: "number",
        description: "Number of categories returned",
        hidden: false,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, site, search, perPage } = context.inputs as {
        integrationId?: string;
        site?: string;
        search?: string;
        perPage?: number;
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

      const url = wordPressApiUrl(resolvedSite, "categories", {
        search,
        per_page: perPage ?? 100,
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

      const categories = (await response.json()) as unknown[];
      return this.createSuccessResult({
        categories,
        count: categories.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error listing WordPress categories"
      );
    }
  }
}
