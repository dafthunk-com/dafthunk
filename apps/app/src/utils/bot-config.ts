import type { WorkflowTemplate } from "@dafthunk/types";

interface BotConfig {
  botId?: string;
  instructions?: string;
  tools?: unknown[];
  commandName?: string;
  agentNodeType?: string;
}

const TRIGGER_BOT_ID_INPUT: Record<string, string> = {
  "receive-discord-message": "discordBotId",
  "receive-telegram-message": "telegramBotId",
  "receive-whatsapp-message": "whatsappAccountId",
};

export function applyBotConfig(
  template: WorkflowTemplate,
  config: BotConfig
): WorkflowTemplate {
  const result: WorkflowTemplate = JSON.parse(JSON.stringify(template));

  const triggerNode = result.nodes.find((n) => n.type.startsWith("receive-"));
  if (triggerNode && config.botId) {
    const inputName = TRIGGER_BOT_ID_INPUT[triggerNode.type];
    if (inputName) {
      const input = triggerNode.inputs?.find((i) => i.name === inputName);
      if (input) {
        input.value = config.botId;
      }
    }
  }

  if (triggerNode && config.commandName) {
    const input = triggerNode.inputs?.find((i) => i.name === "commandName");
    if (input) {
      input.value = config.commandName;
    }
  }

  const agentNode = result.nodes.find((n) => n.type.startsWith("agent-"));
  if (agentNode) {
    if (config.agentNodeType) {
      agentNode.type = config.agentNodeType;
    }
    if (config.instructions) {
      const input = agentNode.inputs?.find((i) => i.name === "instructions");
      if (input) {
        input.value = config.instructions;
      }
    }
    if (config.tools) {
      const input = agentNode.inputs?.find((i) => i.name === "tools");
      if (input) {
        input.value = config.tools;
      }
    }
  }

  return result;
}
