import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

interface WordPressTag {
  id: number;
  name: string;
  slug: string;
  link: string;
  count: number;
}

/**
 * WordPress Create Tag node — create a new tag on a site.
 *
 * The returned ID is suitable for the `tags` field on Create/Update Post.
 */
export class CreateTagWordPressNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "create-tag-wordpress",
    name: "Create Tag (WordPress)",
    type: "create-tag-wordpress",
    description: "Create a new tag on a WordPress.com site",
    tags: ["CMS", "WordPress", "Tag", "Create"],
    icon: "tag",
    documentation:
      "Creates a new tag on the connected WordPress.com site. Returns the tag ID, which can be passed to Create/Update Post via the `tags` input.",
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
        name: "name",
        type: "string",
        description: "Tag name",
        required: true,
      },
      {
        name: "slug",
        type: "string",
        description: "Optional URL slug (defaults to a slugified name)",
        required: false,
      },
      {
        name: "description",
        type: "string",
        description: "Optional description",
        required: false,
      },
    ],
    outputs: [
      { name: "id", type: "number", description: "Created tag ID" },
      { name: "name", type: "string", description: "Tag name" },
      { name: "slug", type: "string", description: "Tag slug" },
      { name: "link", type: "string", description: "Tag archive URL" },
      {
        name: "tag",
        type: "json",
        description: "Full tag data",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, site, name, slug, description } =
        context.inputs as {
          integrationId?: string;
          site?: string;
          name?: string;
          slug?: string;
          description?: string;
        };

      if (!integrationId) {
        return this.createErrorResult(
          "Integration ID is required. Please select a WordPress integration."
        );
      }
      if (!name) {
        return this.createErrorResult("Tag name is required");
      }

      const integration = await context.getIntegration(integrationId);
      const resolvedSite = resolveWordPressSite(integration, site);
      if (!resolvedSite) {
        return this.createErrorResult(
          "Unable to determine WordPress site. Pass `site` (host or blog ID) or reconnect the integration."
        );
      }

      const body: Record<string, unknown> = { name };
      if (slug) body.slug = slug;
      if (description) body.description = description;

      const response = await fetch(wordPressApiUrl(resolvedSite, "tags"), {
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

      const tag = (await response.json()) as WordPressTag;
      return this.createSuccessResult({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        link: tag.link,
        tag,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error creating WordPress tag"
      );
    }
  }
}
