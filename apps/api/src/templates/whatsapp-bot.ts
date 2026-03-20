import { AgentClaudeSonnet4Node } from "@dafthunk/runtime/nodes/agent/agent-claude-sonnet-4-node";
import { BotReceiveWhatsAppMessageNode } from "@dafthunk/runtime/nodes/whatsapp/bot-receive-whatsapp-message-node";
import { BotSendMessageWhatsAppNode } from "@dafthunk/runtime/nodes/whatsapp/bot-send-message-whatsapp-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const whatsappBotTemplate: WorkflowTemplate = {
  id: "whatsapp-bot",
  name: "WhatsApp Bot",
  description:
    "Receive WhatsApp messages, process them with an AI agent, and send replies",
  icon: "bot",
  trigger: "whatsapp_event",
  tags: ["bot", "whatsapp", "agent"],
  nodes: [
    BotReceiveWhatsAppMessageNode.create({
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
          "You are a helpful WhatsApp bot. Answer the user's question concisely.",
      },
    }),
    BotSendMessageWhatsAppNode.create({
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
      sourceOutput: "from",
      targetInput: "agent_id",
    },
    {
      source: "trigger",
      target: "send-reply",
      sourceOutput: "from",
      targetInput: "to",
    },
    {
      source: "agent",
      target: "send-reply",
      sourceOutput: "text",
      targetInput: "text",
    },
  ],
};
