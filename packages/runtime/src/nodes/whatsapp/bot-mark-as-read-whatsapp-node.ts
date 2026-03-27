import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotMarkAsReadWhatsAppNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "mark-as-read-whatsapp",
    name: "Bot Mark As Read (WhatsApp)",
    type: "mark-as-read-whatsapp",
    description: "Mark a WhatsApp message as read",
    tags: ["Social", "WhatsApp", "Message", "Read"],
    icon: "check-check",
    documentation:
      "This node marks a WhatsApp message as read using the WhatsApp Business Cloud API, showing blue check marks to the sender.",
    usage: 5,
    asTool: true,
    inputs: [
      {
        name: "messageId",
        type: "string",
        description: "The ID of the message to mark as read",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "string",
        description: "Whether the operation succeeded",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { messageId } = context.inputs;
      const accessToken = context.whatsappAccessToken;
      const phoneNumberId = context.whatsappPhoneNumberId;

      if (!accessToken || !phoneNumberId) {
        return this.createErrorResult(
          "WhatsApp access token or phone number ID is not available. Ensure the workflow is triggered via a configured WhatsApp account."
        );
      }

      if (!messageId || typeof messageId !== "string") {
        return this.createErrorResult("Message ID is required");
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
            status: "read",
            message_id: messageId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to mark message as read via WhatsApp API: ${errorData}`
        );
      }

      return this.createSuccessResult({
        success: "true",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error marking message as read via WhatsApp"
      );
    }
  }
}
