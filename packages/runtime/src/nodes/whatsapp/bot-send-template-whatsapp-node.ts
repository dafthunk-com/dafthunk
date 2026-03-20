import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotSendTemplateWhatsAppNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-template-whatsapp",
    name: "Bot Send Template (WhatsApp)",
    type: "send-template-whatsapp",
    description:
      "Send a template message via WhatsApp Business API (required for initiating conversations outside 24-hour window)",
    tags: ["Social", "WhatsApp", "Template", "Send"],
    icon: "file-text",
    documentation:
      "This node sends pre-approved template messages via the WhatsApp Business Cloud API. Template messages are required to start conversations outside the 24-hour customer service window.",
    usage: 10,
    inputs: [
      {
        name: "to",
        type: "string",
        description: "Recipient phone number in international format",
        required: true,
      },
      {
        name: "templateName",
        type: "string",
        description: "Name of the approved message template",
        required: true,
      },
      {
        name: "languageCode",
        type: "string",
        description: "Template language code (e.g. en_US)",
        required: false,
      },
      {
        name: "components",
        type: "string",
        description:
          "Template components as JSON string (header, body, button parameters)",
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
      const { to, templateName, languageCode, components } = context.inputs;
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

      if (!templateName || typeof templateName !== "string") {
        return this.createErrorResult("Template name is required");
      }

      const template: Record<string, unknown> = {
        name: templateName,
        language: {
          code:
            languageCode && typeof languageCode === "string"
              ? languageCode
              : "en_US",
        },
      };

      if (components && typeof components === "string") {
        try {
          template.components = JSON.parse(components);
        } catch {
          return this.createErrorResult(
            "Components must be a valid JSON string"
          );
        }
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
            type: "template",
            template,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send template via WhatsApp API: ${errorData}`
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
          : "Unknown error sending template via WhatsApp"
      );
    }
  }
}
