import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotSendMessageTelegramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-message-telegram",
    name: "Bot Send Message (Telegram)",
    type: "send-message-telegram",
    description: "Send a text message to a Telegram chat as the bot",
    tags: ["Social", "Telegram", "Message", "Send"],
    icon: "send",
    documentation:
      "This node sends text messages to Telegram chats using the Telegram Bot API.",
    usage: 10,
    subscription: true,
    inputs: [
      {
        name: "chatId",
        type: "string",
        description: "Telegram chat ID to send the message to",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Message text (up to 4096 characters)",
        required: true,
      },
      {
        name: "parseMode",
        type: "string",
        description: "Text parsing mode",
        enum: ["Markdown", "MarkdownV2", "HTML"],
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
      {
        name: "chatId",
        type: "string",
        description: "Chat ID where the message was sent",
        hidden: true,
      },
      {
        name: "date",
        type: "string",
        description: "Unix timestamp of when the message was sent",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { chatId, text, parseMode } = context.inputs;
      const botToken = context.telegramBotToken;

      if (!botToken) {
        return this.createErrorResult(
          "Telegram bot token is not available. Ensure the workflow is triggered via a configured Telegram bot."
        );
      }

      if (!chatId || typeof chatId !== "string") {
        return this.createErrorResult("Chat ID is required");
      }

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Message text is required");
      }

      if (text.length > 4096) {
        return this.createErrorResult(
          "Message text must be 4096 characters or less"
        );
      }

      const payload: Record<string, string> = {
        chat_id: chatId,
        text,
      };

      if (parseMode && typeof parseMode === "string") {
        payload.parse_mode = parseMode;
      }

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to send message via Telegram API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        result: {
          message_id: number;
          chat: { id: number };
          date: number;
        };
      };

      return this.createSuccessResult({
        messageId: String(data.result.message_id),
        chatId: String(data.result.chat.id),
        date: String(data.result.date),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error sending message via Telegram"
      );
    }
  }
}
