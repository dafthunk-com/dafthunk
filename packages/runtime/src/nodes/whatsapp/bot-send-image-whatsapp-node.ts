import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import {
  imageFilename,
  imageSizeError,
  readOptionalImage,
  type UploadableImage,
} from "../../utils/images";

/** The WhatsApp Cloud API caps image uploads at 5 MB. */
const WHATSAPP_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class BotSendImageWhatsAppNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-image-whatsapp",
    name: "Bot Send Image (WhatsApp)",
    type: "send-image-whatsapp",
    description: "Send an image via WhatsApp Business API",
    tags: ["Social", "WhatsApp", "Image", "Send"],
    icon: "image",
    documentation:
      "This node sends images via the WhatsApp Business Cloud API. To send an image from the web, load it with an Image URL Loader node first.",
    usage: 10,
    inlinable: false,
    asTool: false,
    inputs: [
      {
        name: "to",
        type: "string",
        description: "Recipient phone number in international format",
        required: true,
      },
      {
        name: "image",
        type: "image",
        description: "Image to send",
        required: true,
      },
      {
        name: "caption",
        type: "string",
        description: "Image caption (up to 1024 characters)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "messageId",
        type: "string",
        description: "Sent message ID",
        hidden: true,
      },
    ],
  };

  /**
   * Uploads an image to the phone number's media store and returns its id.
   * WhatsApp takes attachments only by id or by a URL it can fetch itself,
   * so bytes produced inside a workflow have to be staged here first.
   */
  private async uploadImage(
    accessToken: string,
    phoneNumberId: string,
    image: UploadableImage
  ): Promise<string> {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", image.mimeType);
    form.append(
      "file",
      new Blob([image.data], { type: image.mimeType }),
      imageFilename(image)
    );

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to upload image to WhatsApp: ${errorData}`);
    }

    const result = (await response.json()) as { id?: string };
    if (!result.id) {
      throw new Error("WhatsApp media upload returned no media id");
    }

    return result.id;
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { to, caption } = context.inputs;
      const accessToken = context.whatsappAccessToken;
      const phoneNumberId = context.whatsappPhoneNumberId;

      if (!accessToken || !phoneNumberId) {
        return this.createErrorResult(
          "WhatsApp access token or phone number ID is not available. Ensure the workflow is triggered via a configured WhatsApp account."
        );
      }

      if (!to || typeof to !== "string") {
        return this.createErrorResult("Recipient phone number is required");
      }

      const { image, error: imageError } = readOptionalImage(
        context.inputs.image
      );
      if (imageError) {
        return this.createErrorResult(imageError);
      }
      if (!image) {
        return this.createErrorResult("Image is required");
      }

      const sizeError = imageSizeError(
        image,
        WHATSAPP_MAX_IMAGE_BYTES,
        "WhatsApp"
      );
      if (sizeError) {
        return this.createErrorResult(sizeError);
      }

      const mediaId = await this.uploadImage(accessToken, phoneNumberId, image);

      const imagePayload: Record<string, string> = { id: mediaId };
      if (caption && typeof caption === "string") {
        if (caption.length > 1024) {
          return this.createErrorResult(
            "Caption must be 1024 characters or less"
          );
        }
        imagePayload.caption = caption;
      }

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "image",
            image: imagePayload,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send image via WhatsApp API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        messages: { id: string }[];
      };

      return this.createSuccessResult({
        messageId: data.messages[0]?.id ?? "",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sending image via WhatsApp"
      );
    }
  }
}
