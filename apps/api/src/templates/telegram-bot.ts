import { AgentClaudeSonnet4Node } from "@dafthunk/runtime/nodes/agent/agent-claude-sonnet-4-node";
import { BotReceiveTelegramMessageNode } from "@dafthunk/runtime/nodes/telegram/bot-receive-telegram-message-node";
import { BotSendMessageTelegramNode } from "@dafthunk/runtime/nodes/telegram/bot-send-message-telegram-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const telegramBotTemplate: WorkflowTemplate = {
  id: "telegram-bot",
  name: "Telegram Bot",
  description:
    "Receive Telegram messages, process them with an AI agent, and send replies",
  icon: "bot",
  trigger: "telegram_event",
  tags: ["bot", "telegram", "agent"],
  nodes: [
    BotReceiveTelegramMessageNode.create({
      id: "trigger",
      name: "Receive Message",
      position: { x: 100, y: 200 },
    }),
    AgentClaudeSonnet4Node.create({
      id: "agent",
      name: "AI Agent",
      position: { x: 500, y: 200 },
      inputs: {
        instructions:
          "You are a helpful Telegram bot. Answer the user's question concisely.",
      },
    }),
    BotSendMessageTelegramNode.create({
      id: "send-reply",
      name: "Send Reply",
      position: { x: 900, y: 200 },
    }),
  ],
  edges: [
    {
      source: "trigger",
      target: "agent",
      sourceOutput: "content",
      targetInput: "input",
    },
    {
      source: "trigger",
      target: "agent",
      sourceOutput: "chatId",
      targetInput: "agent_id",
    },
    {
      source: "trigger",
      target: "send-reply",
      sourceOutput: "chatId",
      targetInput: "chatId",
    },
    {
      source: "agent",
      target: "send-reply",
      sourceOutput: "text",
      targetInput: "text",
    },
  ],
};
