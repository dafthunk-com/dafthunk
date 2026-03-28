import type { ImageParameter } from "@dafthunk/runtime";
import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * LinkedIn Share Post node implementation
 * Shares a post to LinkedIn with optional image or link attachment
 */
export class SharePostLinkedInNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "share-post-linkedin",
    name: "Share Post (LinkedIn)",
    type: "share-post-linkedin",
    description: "Share a post to your LinkedIn profile",
    tags: ["Social", "LinkedIn", "Post", "Share"],
    icon: "send",
    documentation:
      "This node shares a post to your LinkedIn profile. Supports text content with optional image or link attachments. Requires a connected LinkedIn integration.",
    usage: 10,
    subscription: true,
    asTool: true,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "linkedin",
        description: "LinkedIn integration to use",
        hidden: true,
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Post text content",
        required: true,
      },
      {
        name: "image",
        type: "image",
        description: "Optional image to attach to the post",
        required: false,
      },
      {
        name: "linkUrl",
        type: "string",
        description: "Optional link URL to attach to the post",
        required: false,
      },
      {
        name: "linkTitle",
        type: "string",
        description: "Title for the link attachment",
        required: false,
      },
      {
        name: "linkDescription",
        type: "string",
        description: "Description for the link attachment",
        required: false,
      },
      {
        name: "visibility",
        type: "string",
        description: "Post visibility: PUBLIC or CONNECTIONS",
        required: false,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "LinkedIn post ID",
        hidden: false,
      },
      {
        name: "urn",
        type: "string",
        description: "LinkedIn post URN",
        hidden: true,
      },
    ],
  };

  private async registerAndUploadImage(
    accessToken: string,
    userId: string,
    image: ImageParameter
  ): Promise<string> {
    // Step 1: Register the upload to get an upload URL and asset URN
    const registerResponse = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: `urn:li:person:${userId}`,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      }
    );

    if (!registerResponse.ok) {
      const errorData = await registerResponse.text();
      throw new Error(`Failed to register image upload: ${errorData}`);
    }

    const registerResult = (await registerResponse.json()) as {
      value: {
        asset: string;
        uploadMechanism: {
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
            uploadUrl: string;
          };
        };
      };
    };

    const uploadUrl =
      registerResult.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;
    const assetUrn = registerResult.value.asset;

    // Step 2: Upload the image binary data
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": image.mimeType,
      },
      body: image.data,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      throw new Error(`Failed to upload image: ${errorData}`);
    }

    return assetUrn;
  }

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        integrationId,
        text,
        image,
        linkUrl,
        linkTitle,
        linkDescription,
        visibility,
      } = context.inputs as {
        integrationId?: string;
        text?: string;
        image?: ImageParameter;
        linkUrl?: string;
        linkTitle?: string;
        linkDescription?: string;
        visibility?: string;
      };
      const { organizationId } = context;

      // Validate required inputs
      if (!integrationId || typeof integrationId !== "string") {
        return this.createErrorResult(
          "Integration ID is required. Please select a LinkedIn integration."
        );
      }

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Text content is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Cannot attach both image and link
      if (image?.data && linkUrl) {
        return this.createErrorResult(
          "Cannot attach both an image and a link. Please provide only one."
        );
      }

      // Validate visibility
      const postVisibility =
        visibility && typeof visibility === "string"
          ? visibility.toUpperCase()
          : "PUBLIC";
      if (postVisibility !== "PUBLIC" && postVisibility !== "CONNECTIONS") {
        return this.createErrorResult(
          "Visibility must be 'PUBLIC' or 'CONNECTIONS'"
        );
      }

      // Get integration with auto-refreshed token
      const integration = await context.getIntegration(integrationId);
      const accessToken = integration.token;

      // Get user's LinkedIn ID from metadata
      const metadata = integration.metadata as { userId?: string } | undefined;
      const userId = metadata?.userId;

      if (!userId) {
        return this.createErrorResult(
          "LinkedIn user ID not found in integration metadata"
        );
      }

      // Build share content based on attachment type
      let shareMediaCategory = "NONE";
      const media: Array<Record<string, unknown>> = [];

      if (image?.data && image?.mimeType) {
        // Upload image and get asset URN
        const assetUrn = await this.registerAndUploadImage(
          accessToken,
          userId,
          image
        );
        shareMediaCategory = "IMAGE";
        media.push({
          status: "READY",
          media: assetUrn,
        });
      } else if (linkUrl && typeof linkUrl === "string") {
        shareMediaCategory = "ARTICLE";
        const linkMedia: Record<string, unknown> = {
          status: "READY",
          originalUrl: linkUrl,
        };
        if (linkTitle && typeof linkTitle === "string") {
          linkMedia.title = { text: linkTitle };
        }
        if (linkDescription && typeof linkDescription === "string") {
          linkMedia.description = { text: linkDescription };
        }
        media.push(linkMedia);
      }

      // Prepare post data using LinkedIn UGC Post API
      const shareContent: Record<string, unknown> = {
        shareCommentary: {
          text: text as string,
        },
        shareMediaCategory,
      };

      if (media.length > 0) {
        shareContent.media = media;
      }

      const postData = {
        author: `urn:li:person:${userId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": shareContent,
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": postVisibility,
        },
      };

      // Share post via LinkedIn API
      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to share post via LinkedIn API: ${errorData}`
        );
      }

      const result = (await response.json()) as {
        id: string;
      };

      return this.createSuccessResult({
        id: result.id,
        urn: `urn:li:share:${result.id}`,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sharing post to LinkedIn"
      );
    }
  }
}
