import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotSendImageWhatsAppNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-image-whatsapp",
    name: "Bot Send Image (WhatsApp)",
    type: "send-image-whatsapp",
    description: "Send an image via WhatsApp Business API",
    tags: ["Social", "WhatsApp", "Image", "Send"],
    icon: "image",
    documentation:
      "This node sends images via the WhatsApp Business Cloud API using a publicly accessible URL.",
    usage: 10,
    inputs: [
      {
        name: "to",
        type: "string",
        description: "Recipient phone number in international format",
        required: true,
      },
      {
        name: "imageUrl",
        type: "string",
        description: "Publicly accessible image URL",
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

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { to, imageUrl, caption } = context.inputs;
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

      if (!imageUrl || typeof imageUrl !== "string") {
        return this.createErrorResult("Image URL is required");
      }

      const imagePayload: Record<string, string> = { link: imageUrl };
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
