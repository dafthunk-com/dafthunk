import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotReceiveTelegramMessageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "receive-telegram-message",
    name: "Bot Receive Message (Telegram)",
    type: "receive-telegram-message",
    description: "Receive an incoming message from a Telegram chat via the bot",
    tags: ["Social", "Telegram", "Message", "Receive"],
    icon: "message-square",
    documentation:
      "This node receives incoming Telegram messages, providing access to chat ID, message content, and author details.",
    compatibility: ["telegram_event"],
    trigger: true,
    inlinable: true,
    usage: 0,
    inputs: [
      {
        name: "telegramBotId",
        type: "telegram",
        description: "The Telegram bot to use for this trigger",
        hidden: true,
        required: false,
      },
      {
        name: "chatId",
        type: "string",
        description: "The Telegram chat ID to listen on",
        hidden: true,
        required: false,
      },
    ],
    outputs: [
      {
        name: "telegramBotId",
        type: "string",
        description: "The Telegram bot ID used for this trigger",
      },
      {
        name: "chatId",
        type: "string",
        description: "Telegram chat ID",
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
        name: "authorId",
        type: "string",
        description: "Message author's user ID",
      },
      {
        name: "authorUsername",
        type: "string",
        description: "Message author's username",
      },
      {
        name: "authorFirstName",
        type: "string",
        description: "Message author's first name",
      },
      {
        name: "timestamp",
        type: "string",
        description: "Unix timestamp of when the message was sent",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.telegramMessage) {
        throw new Error(
          "Telegram message information is required but not provided in the context."
        );
      }

      const { telegramBotId, chatId, messageId, content, author, timestamp } =
        context.telegramMessage;

      return this.createSuccessResult({
        telegramBotId: telegramBotId ?? "",
        chatId: String(chatId),
        messageId: String(messageId),
        content,
        authorId: String(author.id),
        authorUsername: author.username,
        authorFirstName: author.firstName,
        timestamp: String(timestamp),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
