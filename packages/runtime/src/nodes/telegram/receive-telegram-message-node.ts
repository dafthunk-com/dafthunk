import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class ReceiveTelegramMessageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "receive-telegram-message",
    name: "Receive Telegram Message",
    type: "receive-telegram-message",
    description:
      "Extracts chat, message content, and author from an incoming Telegram message.",
    tags: ["Social", "Telegram", "Message", "Receive"],
    icon: "message-square",
    documentation:
      "This node extracts information from incoming Telegram messages, providing access to chat ID, message content, and author details.",
    compatibility: ["telegram_event"],
    inlinable: true,
    inputs: [],
    outputs: [
      {
        name: "chatId",
        type: "number",
        description: "The Telegram chat ID.",
      },
      {
        name: "messageId",
        type: "number",
        description: "The unique message ID.",
      },
      {
        name: "content",
        type: "string",
        description: "The message text content.",
      },
      {
        name: "authorId",
        type: "number",
        description: "The message author's user ID.",
      },
      {
        name: "authorUsername",
        type: "string",
        description: "The message author's username.",
      },
      {
        name: "authorFirstName",
        type: "string",
        description: "The message author's first name.",
      },
      {
        name: "timestamp",
        type: "number",
        description: "Unix timestamp of when the message was sent.",
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

      const { chatId, messageId, content, author, timestamp } =
        context.telegramMessage;

      return this.createSuccessResult({
        chatId,
        messageId,
        content,
        authorId: author.id,
        authorUsername: author.username,
        authorFirstName: author.firstName,
        timestamp,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
