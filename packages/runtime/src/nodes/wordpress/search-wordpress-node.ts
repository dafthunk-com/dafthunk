import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";
import { zodErrorMessage } from "../../utils/zod";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

/**
 * WordPress Search node — cross-content search across posts, pages, and terms.
 *
 * Hits `/wp/v2/search`, which is purpose-built for "find anything on the site"
 * UX. Results carry a `subtype` so the caller can branch on content type.
 */
export class SearchWordPressNode extends ExecutableNode {
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
    search: z
      .string({ error: "Search query is required" })
      .min(1, { error: "Search query is required" }),
    type: z.string().optional(),
    subtype: z.string().optional(),
    perPage: z.number().optional(),
    page: z.number().optional(),
  });

  public static readonly nodeType: NodeType = {
    id: "search-wordpress",
    name: "Search (WordPress)",
    type: "search-wordpress",
    description: "Search across WordPress.com content (posts, pages, terms)",
    tags: ["CMS", "WordPress", "Search"],
    icon: "search",
    documentation:
      "Searches across all content types on the connected WordPress.com site. Each result has a `subtype` (e.g. `post`, `page`, `category`) and a URL.",
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
        description: "Search query",
        required: true,
      },
      {
        name: "type",
        type: "string",
        description: "Content type filter: post, term, or post-format",
        required: false,
      },
      {
        name: "subtype",
        type: "string",
        description: "Subtype filter (e.g. 'post', 'page', 'category')",
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
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description: "Array of search results",
      },
      {
        name: "count",
        type: "number",
        description: "Number of results returned",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const parsed = SearchWordPressNode.inputSchema.safeParse(context.inputs);
      if (!parsed.success) {
        return this.createErrorResult(zodErrorMessage(parsed.error));
      }
      const { integrationId, site, search, type, subtype, perPage, page } =
        parsed.data;

      const integration = await context.getIntegration(integrationId);
      const resolvedSite = resolveWordPressSite(integration, site);
      if (!resolvedSite) {
        return this.createErrorResult(
          "Unable to determine WordPress site. Pass `site` (host or blog ID) or reconnect the integration."
        );
      }

      const url = wordPressApiUrl(resolvedSite, "search", {
        search,
        type,
        subtype,
        per_page: perPage ?? 10,
        page: page ?? 1,
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

      const results = (await response.json()) as unknown[];
      return this.createSuccessResult({
        results,
        count: results.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error searching WordPress"
      );
    }
  }
}
