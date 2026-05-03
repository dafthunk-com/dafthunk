import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

interface WordPressSite {
  ID: number;
  name: string;
  description: string;
  URL: string;
  jetpack: boolean;
  post_count: number;
  subscribers_count: number;
  lang: string;
  icon?: { img?: string; ico?: string };
}

/**
 * WordPress Get Site node — fetch site-level metadata.
 *
 * Uses the legacy WP.com v1.1 site endpoint, which exposes richer information
 * than v2 (post count, subscriber count, site icon, etc.).
 */
export class GetSiteWordPressNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-site-wordpress",
    name: "Get Site (WordPress)",
    type: "get-site-wordpress",
    description: "Get site-level metadata for a WordPress.com site",
    tags: ["CMS", "WordPress", "Site", "Get"],
    icon: "info",
    documentation:
      "Returns site metadata including name, description, URL, post count, subscriber count, and site icon. Defaults to the user's primary blog when `site` is not provided.",
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
    ],
    outputs: [
      { name: "id", type: "number", description: "Numeric site ID" },
      { name: "name", type: "string", description: "Site name" },
      { name: "description", type: "string", description: "Site description" },
      { name: "url", type: "string", description: "Public URL" },
      {
        name: "postCount",
        type: "number",
        description: "Number of published posts",
      },
      {
        name: "subscribersCount",
        type: "number",
        description: "Number of subscribers",
        hidden: true,
      },
      {
        name: "language",
        type: "string",
        description: "Site language code",
        hidden: true,
      },
      {
        name: "iconUrl",
        type: "string",
        description: "Site icon URL (favicon)",
        hidden: true,
      },
      {
        name: "site",
        type: "json",
        description: "Full site data",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, site } = context.inputs as {
        integrationId?: string;
        site?: string;
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

      const response = await fetch(
        wordPressApiUrl(resolvedSite, "", undefined, { apiVersion: "v1.1" }),
        {
          headers: {
            Authorization: `Bearer ${integration.token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return this.createErrorResult(
          `WordPress API error (${response.status}): ${errorText}`
        );
      }

      const data = (await response.json()) as WordPressSite;
      return this.createSuccessResult({
        id: data.ID,
        name: data.name,
        description: data.description,
        url: data.URL,
        postCount: data.post_count,
        subscribersCount: data.subscribers_count,
        language: data.lang,
        iconUrl: data.icon?.img ?? data.icon?.ico,
        site: data,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error fetching WordPress site"
      );
    }
  }
}
