import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotForwardMessageTelegramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "forward-message-telegram",
    name: "Bot Forward Message (Telegram)",
    type: "forward-message-telegram",
    description:
      "Forward a message from one Telegram chat to another as the bot",
    tags: ["Social", "Telegram", "Message", "Forward"],
    icon: "forward",
    documentation:
      "This node forwards messages between Telegram chats using the Telegram Bot API.",
    usage: 10,
    inputs: [
      {
        name: "chatId",
        type: "string",
        description: "Target chat ID to forward the message to",
        required: true,
      },
      {
        name: "fromChatId",
        type: "string",
        description: "Source chat ID where the original message was sent",
        required: true,
      },
      {
        name: "messageId",
        type: "string",
        description: "ID of the message to forward",
        required: true,
      },
    ],
    outputs: [
      {
        name: "messageId",
        type: "string",
        description: "Forwarded message ID",
        hidden: true,
      },
      {
        name: "chatId",
        type: "string",
        description: "Chat ID where the message was forwarded to",
        hidden: true,
      },
      {
        name: "date",
        type: "string",
        description: "Unix timestamp of when the message was forwarded",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { chatId, fromChatId, messageId } = context.inputs;
      const botToken = context.telegramBotToken;

      if (!botToken) {
        return this.createErrorResult(
          "Telegram bot token is not available. Ensure the workflow is triggered via a configured Telegram bot."
        );
      }

      if (!chatId || typeof chatId !== "string") {
        return this.createErrorResult("Target chat ID is required");
      }

      if (!fromChatId || typeof fromChatId !== "string") {
        return this.createErrorResult("Source chat ID is required");
      }

      if (!messageId || typeof messageId !== "string") {
        return this.createErrorResult("Message ID is required");
      }

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/forwardMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            from_chat_id: fromChatId,
            message_id: Number(messageId),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to forward message via Telegram API: ${errorData}`
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
          : "Unknown error forwarding message via Telegram"
      );
    }
  }
}
