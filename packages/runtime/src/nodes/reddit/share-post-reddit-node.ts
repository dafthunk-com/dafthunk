import type { ImageParameter } from "@dafthunk/runtime";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Reddit Share Post node implementation
 * Shares a new post to a subreddit
 */
export class SharePostRedditNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "share-post-reddit",
    name: "Share Post (Reddit)",
    type: "share-post-reddit",
    description: "Share a new post to a subreddit",
    tags: ["Social", "Reddit", "Post", "Share"],
    icon: "send",
    documentation:
      "This node shares a new post to a specified subreddit. Supports text posts, link posts, and image posts. Requires a connected Reddit integration.",
    usage: 10,
    subscription: true,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "reddit",
        description: "Reddit integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "subreddit",
        type: "string",
        description: "Subreddit name (without r/ prefix)",
        required: true,
      },
      {
        name: "title",
        type: "string",
        description: "Post title (max 300 characters)",
        required: true,
      },
      {
        name: "kind",
        type: "string",
        description:
          "Post type: 'self' for text, 'link' for URL, or 'image' for image",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Post text content (for self posts)",
        required: false,
      },
      {
        name: "url",
        type: "string",
        description: "Post URL (for link posts)",
        required: false,
      },
      {
        name: "image",
        type: "image",
        description: "Image to upload (for image posts)",
        required: false,
      },
      {
        name: "nsfw",
        type: "boolean",
        description: "Mark post as NSFW",
        required: false,
      },
      {
        name: "spoiler",
        type: "boolean",
        description: "Mark post as spoiler",
        required: false,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Reddit post ID",
        hidden: false,
      },
      {
        name: "name",
        type: "string",
        description: "Reddit full name (kind + id)",
        hidden: true,
      },
      {
        name: "url",
        type: "string",
        description: "Post URL on Reddit",
        hidden: false,
      },
      {
        name: "permalink",
        type: "string",
        description: "Post permalink",
        hidden: true,
      },
    ],
  };

  private async uploadImage(
    accessToken: string,
    image: ImageParameter
  ): Promise<string> {
    const extension = image.mimeType.split("/")[1] || "png";
    const filename = image.filename || `image.${extension}`;

    // Step 1: Request upload lease
    const leaseResponse = await fetch(
      "https://oauth.reddit.com/api/media/asset.json",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Dafthunk/1.0",
        },
        body: new URLSearchParams({
          filepath: filename,
          mimetype: image.mimeType,
        }),
      }
    );

    if (!leaseResponse.ok) {
      const errorData = await leaseResponse.text();
      throw new Error(`Failed to request upload lease: ${errorData}`);
    }

    const lease = (await leaseResponse.json()) as {
      args: {
        action: string;
        fields: Array<{ name: string; value: string }>;
      };
      asset: {
        asset_id: string;
      };
    };

    const uploadUrl = `https:${lease.args.action}`;
    const key = lease.args.fields.find((f) => f.name === "key")?.value ?? "";

    // Step 2: Upload image to S3 via multipart form data
    const formData = new FormData();
    for (const field of lease.args.fields) {
      formData.append(field.name, field.value);
    }
    // File must be the last field
    formData.append(
      "file",
      new Blob([image.data], { type: image.mimeType }),
      filename
    );

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      throw new Error(`Failed to upload image: ${errorData}`);
    }

    return `${uploadUrl}/${key}`;
  }

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        integrationId,
        subreddit,
        title,
        kind,
        text,
        url,
        image,
        nsfw,
        spoiler,
      } = context.inputs as {
        integrationId?: string;
        subreddit?: string;
        title?: string;
        kind?: string;
        text?: string;
        url?: string;
        image?: ImageParameter;
        nsfw?: boolean;
        spoiler?: boolean;
      };
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a Reddit integration."
        );
      }

      if (!subreddit || typeof subreddit !== "string") {
        return this.createErrorResult("Subreddit is required");
      }

      if (!title || typeof title !== "string") {
        return this.createErrorResult("Title is required");
      }

      if (!kind || typeof kind !== "string") {
        return this.createErrorResult(
          "Post kind is required (self, link, or image)"
        );
      }

      if (kind !== "self" && kind !== "link" && kind !== "image") {
        return this.createErrorResult(
          "Post kind must be 'self', 'link', or 'image'"
        );
      }

      if (kind === "self" && (!text || typeof text !== "string")) {
        return this.createErrorResult("Text is required for self posts");
      }

      if (kind === "link" && (!url || typeof url !== "string")) {
        return this.createErrorResult("URL is required for link posts");
      }

      if (kind === "image" && (!image?.data || !image?.mimeType)) {
        return this.createErrorResult("Image is required for image posts");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      // Prepare form data for submission
      const formData = new URLSearchParams({
        api_type: "json",
        sr: subreddit,
        title,
        kind,
      });

      if (kind === "self" && text) {
        formData.append("text", text as string);
      } else if (kind === "link" && url) {
        formData.append("url", url as string);
      } else if (kind === "image" && image?.data && image?.mimeType) {
        const imageUrl = await this.uploadImage(accessToken, image);
        formData.append("url", imageUrl);
        formData.append("resubmit", "true");
      }

      if (nsfw === true) {
        formData.append("nsfw", "true");
      }

      if (spoiler === true) {
        formData.append("spoiler", "true");
      }

      // Share post via Reddit API
      const response = await fetch("https://oauth.reddit.com/api/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Dafthunk/1.0",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to share post via Reddit API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        json: {
          errors: Array<string[]>;
          data?: {
            id: string;
            name: string;
            url: string;
            permalink?: string;
          };
        };
      };

      if (result.json.errors && result.json.errors.length > 0) {
        return this.createErrorResult(
          `Reddit API error: ${JSON.stringify(result.json.errors)}`
        );
      }

      if (!result.json.data) {
        return this.createErrorResult("No data returned from Reddit API");
      }

      return this.createSuccessResult({
        id: result.json.data.id,
        name: result.json.data.name,
        url: result.json.data.url,
        permalink: result.json.data.permalink,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sharing post to Reddit"
      );
    }
  }
}
