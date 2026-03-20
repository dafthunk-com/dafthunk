import { AgentClaudeSonnet4Node } from "@dafthunk/runtime/nodes/agent/agent-claude-sonnet-4-node";
import { BotReceiveDiscordMessageNode } from "@dafthunk/runtime/nodes/discord/bot-receive-discord-message-node";
import { BotSendMessageDiscordNode } from "@dafthunk/runtime/nodes/discord/bot-send-message-discord-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const discordBotTemplate: WorkflowTemplate = {
  id: "discord-bot",
  name: "Discord Bot",
  description:
    "Receive Discord messages, process them with an AI agent, and send replies",
  icon: "bot",
  trigger: "discord_event",
  tags: ["bot", "discord", "agent"],
  nodes: [
    BotReceiveDiscordMessageNode.create({
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
          "You are a helpful Discord bot. Answer the user's question concisely.",
      },
    }),
    BotSendMessageDiscordNode.create({
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
      sourceOutput: "channelId",
      targetInput: "agent_id",
    },
    {
      source: "trigger",
      target: "send-reply",
      sourceOutput: "channelId",
      targetInput: "channelId",
    },
    {
      source: "trigger",
      target: "send-reply",
      sourceOutput: "interactionToken",
      targetInput: "interactionToken",
    },
    {
      source: "trigger",
      target: "send-reply",
      sourceOutput: "applicationId",
      targetInput: "applicationId",
    },
    {
      source: "agent",
      target: "send-reply",
      sourceOutput: "text",
      targetInput: "content",
    },
  ],
};
