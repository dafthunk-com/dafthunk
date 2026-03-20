import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotSendMessageWhatsAppNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-message-whatsapp",
    name: "Bot Send Message (WhatsApp)",
    type: "send-message-whatsapp",
    description: "Send a text message via WhatsApp Business API",
    tags: ["Social", "WhatsApp", "Message", "Send"],
    icon: "send",
    documentation:
      "This node sends text messages via the WhatsApp Business Cloud API.",
    usage: 10,
    inputs: [
      {
        name: "to",
        type: "string",
        description:
          "Recipient phone number in international format (e.g. 15551234567)",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Message text (up to 4096 characters)",
        required: true,
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
      const { to, text } = context.inputs;
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

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Message text is required");
      }

      if (text.length > 4096) {
        return this.createErrorResult(
          "Message text must be 4096 characters or less"
        );
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
            type: "text",
            text: { body: text },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send message via WhatsApp API: ${errorData}`
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
          : "Unknown error sending message via WhatsApp"
      );
    }
  }
}
