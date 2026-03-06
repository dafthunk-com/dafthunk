import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class BotGetChatTelegramNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-chat-telegram",
    name: "Bot Get Chat (Telegram)",
    type: "get-chat-telegram",
    description: "Get information about a Telegram chat via the bot",
    tags: ["Social", "Telegram", "Chat", "Info"],
    icon: "info",
    documentation:
      "This node retrieves information about a Telegram chat using the Telegram Bot API. Requires TELEGRAM_BOT_TOKEN.",
    usage: 5,
    inputs: [
      {
        name: "chatId",
        type: "string",
        description: "Telegram chat ID",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "number",
        description: "Chat ID",
      },
      {
        name: "type",
        type: "string",
        description: "Chat type (private, group, supergroup, channel)",
      },
      {
        name: "title",
        type: "string",
        description: "Chat title (for groups, supergroups, channels)",
      },
      {
        name: "username",
        type: "string",
        description: "Chat username (if available)",
      },
      {
        name: "firstName",
        type: "string",
        description: "First name (for private chats)",
      },
      {
        name: "description",
        type: "string",
        description: "Chat description or bio",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { chatId } = context.inputs;
      const botToken = context.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        return this.createErrorResult(
          "TELEGRAM_BOT_TOKEN is not configured in the environment."
        );
      }

      if (!chatId || typeof chatId !== "string") {
        return this.createErrorResult("Chat ID is required");
      }

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getChat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        return this.createErrorResult(
          `Failed to get chat info via Telegram API: ${errorData}`
        );
      }

      const data = (await response.json()) as {
        result: {
          id: number;
          type: string;
          title?: string;
          username?: string;
          first_name?: string;
          description?: string;
        };
      };

      return this.createSuccessResult({
        id: data.result.id,
        type: data.result.type,
        title: data.result.title ?? "",
        username: data.result.username ?? "",
        firstName: data.result.first_name ?? "",
        description: data.result.description ?? "",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error getting chat info via Telegram"
      );
    }
  }
}
