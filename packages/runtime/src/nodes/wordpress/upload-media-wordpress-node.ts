import {
  ExecutableNode,
  type ImageParameter,
  type NodeContext,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import { resolveWordPressSite, wordPressApiUrl } from "./wordpress-utils";

interface WordPressMedia {
  id: number;
  source_url: string;
  link: string;
  media_type: string;
  mime_type: string;
  title: { rendered: string };
}

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * WordPress Upload Media node — upload an image to the site's Media Library.
 *
 * Sends the binary directly to the REST endpoint with `Content-Disposition`
 * carrying the filename, which is how WordPress derives the attachment name.
 */
export class UploadMediaWordPressNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "upload-media-wordpress",
    name: "Upload Media (WordPress)",
    type: "upload-media-wordpress",
    description: "Upload an image to a WordPress.com site's Media Library",
    tags: ["CMS", "WordPress", "Media", "Upload"],
    icon: "upload",
    documentation:
      "Uploads an image to the connected WordPress.com site's Media Library. The returned media ID can be used as a `featured_media` when creating posts, or as the `src` of an `<img>` in post content.",
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
        name: "image",
        type: "image",
        description: "Image to upload",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "Optional title for the media item",
        required: false,
      },
      {
        name: "altText",
        type: "string",
        description: "Optional alt text (recommended for accessibility)",
        required: false,
      },
      {
        name: "caption",
        type: "string",
        description: "Optional caption",
        required: false,
      },
    ],
    outputs: [
      { name: "id", type: "number", description: "Media ID" },
      { name: "sourceUrl", type: "string", description: "Direct file URL" },
      { name: "link", type: "string", description: "Public media page URL" },
      {
        name: "mimeType",
        type: "string",
        description: "Media MIME type",
        hidden: true,
      },
      {
        name: "media",
        type: "json",
        description: "Full media data",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { integrationId, site, image, title, altText, caption } =
        context.inputs as {
          integrationId?: string;
          site?: string;
          image?: ImageParameter;
          title?: string;
          altText?: string;
          caption?: string;
        };

      if (!integrationId) {
        return this.createErrorResult(
          "Integration ID is required. Please select a WordPress integration."
        );
      }
      if (!image || !image.data || !image.mimeType) {
        return this.createErrorResult("Image is required");
      }

      const integration = await context.getIntegration(integrationId);
      const resolvedSite = resolveWordPressSite(integration, site);
      if (!resolvedSite) {
        return this.createErrorResult(
          "Unable to determine WordPress site. Pass `site` (host or blog ID) or reconnect the integration."
        );
      }

      const ext =
        MIME_EXTENSIONS[image.mimeType.toLowerCase()] ??
        image.mimeType.split("/")[1] ??
        "bin";
      const filename = image.filename ?? `upload-${Date.now()}.${ext}`;

      const uploadResponse = await fetch(
        wordPressApiUrl(resolvedSite, "media"),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${integration.token}`,
            "Content-Type": image.mimeType,
            "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
            Accept: "application/json",
          },
          body: image.data as BodyInit,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        return this.createErrorResult(
          `WordPress upload failed (${uploadResponse.status}): ${errorText}`
        );
      }

      let media = (await uploadResponse.json()) as WordPressMedia;

      const patch: Record<string, unknown> = {};
      if (title) patch.title = title;
      if (altText) patch.alt_text = altText;
      if (caption) patch.caption = caption;
      if (Object.keys(patch).length > 0) {
        const patchResponse = await fetch(
          wordPressApiUrl(resolvedSite, `media/${media.id}`),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${integration.token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(patch),
          }
        );
        if (patchResponse.ok) {
          media = (await patchResponse.json()) as WordPressMedia;
        }
      }

      return this.createSuccessResult({
        id: media.id,
        sourceUrl: media.source_url,
        link: media.link,
        mimeType: media.mime_type,
        media,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error uploading WordPress media"
      );
    }
  }
}
