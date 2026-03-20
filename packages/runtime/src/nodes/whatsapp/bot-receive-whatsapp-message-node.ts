import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotReceiveWhatsAppMessageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "receive-whatsapp-message",
    name: "Bot Receive Message (WhatsApp)",
    type: "receive-whatsapp-message",
    description:
      "Receive an incoming message from WhatsApp via the Business API",
    tags: ["Social", "WhatsApp", "Message", "Receive"],
    icon: "message-square",
    documentation:
      "This node receives incoming WhatsApp messages, providing access to phone number, message content, and author details.",
    trigger: true,
    inlinable: true,
    usage: 0,
    inputs: [
      {
        name: "whatsappAccountId",
        type: "whatsapp",
        description: "The WhatsApp account to use for this trigger",
        hidden: true,
        required: false,
      },
      {
        name: "phoneNumberId",
        type: "string",
        description: "The WhatsApp phone number ID to listen on",
        hidden: true,
        required: false,
      },
    ],
    outputs: [
      {
        name: "whatsappAccountId",
        type: "string",
        description: "The WhatsApp account ID used for this trigger",
      },
      {
        name: "phoneNumberId",
        type: "string",
        description: "WhatsApp phone number ID",
      },
      {
        name: "from",
        type: "string",
        description: "Sender phone number",
      },
      {
        name: "messageId",
        type: "string",
        description: "Unique message ID",
      },
      {
        name: "content",
        type: "string",
        description: "Message text content",
      },
      {
        name: "authorName",
        type: "string",
        description: "Message author's profile name",
      },
      {
        name: "authorPhone",
        type: "string",
        description: "Message author's phone number",
      },
      {
        name: "timestamp",
        type: "string",
        description: "Unix timestamp of when the message was sent",
      },
      {
        name: "messageType",
        type: "string",
        description: "Type of message (text, image, document, etc.)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.whatsappMessage) {
        throw new Error(
          "WhatsApp message information is required but not provided in the context."
        );
      }

      const {
        whatsappAccountId,
        phoneNumberId,
        from,
        messageId,
        content,
        author,
        timestamp,
        messageType,
      } = context.whatsappMessage;

      return this.createSuccessResult({
        whatsappAccountId: whatsappAccountId ?? "",
        phoneNumberId,
        from,
        messageId,
        content,
        authorName: author.name,
        authorPhone: author.phoneNumber,
        timestamp: String(timestamp),
        messageType,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
