import type { Workflow, WorkflowTrigger } from "@dafthunk/types";
import { Hono } from "hono";

import type { ApiContext } from "../context";
import {
  createDatabase,
  getBot,
  getBotTriggersByBot,
  getOrganizationBillingInfo,
  resolveOrganizationPlan,
} from "../db";
import { getAgentByName } from "../durable-objects/agent-utils";
import { createWorkerRuntime } from "../runtime/cloudflare-worker-runtime";
import { WorkflowStore } from "../stores/workflow-store";
import { decryptSecret } from "../utils/encryption";

const telegramWebhook = new Hono<ApiContext>();

/**
 * Public webhook endpoint called by Telegram with updates.
 * Routed by telegramBotId. Authenticated via the secret_token registered with Telegram's setWebhook API.
 */
telegramWebhook.post("/webhook/:telegramBotId", async (c) => {
  const telegramBotId = c.req.param("telegramBotId");
  const db = createDatabase(c.env.DB);

  // Verify the secret token sent by Telegram (stored in trigger metadata)
  const incomingToken = c.req.header("X-Telegram-Bot-Api-Secret-Token");
  const triggers = await getBotTriggersByBot(db, telegramBotId);
  const firstMeta = triggers[0]?.botTrigger.metadata
    ? (JSON.parse(triggers[0].botTrigger.metadata) as {
        secretToken?: string;
      })
    : null;
  const expectedToken = firstMeta?.secretToken;

  if (!expectedToken || incomingToken !== expectedToken) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const update = (await c.req.json()) as {
      message?: {
        message_id: number;
        from: {
          id: number;
          is_bot: boolean;
          first_name: string;
          username?: string;
        };
        chat: { id: number };
        date: number;
        text?: string;
      };
    };

    if (!update.message) {
      return c.json({ ok: true });
    }

    const msg = update.message;

    // Skip bot messages
    if (msg.from.is_bot) {
      return c.json({ ok: true });
    }

    // Dispatch workflows in the background
    const env = c.env;
    c.executionCtx.waitUntil(
      dispatchWorkflows(env, telegramBotId, {
        telegramBotId,
        chatId: msg.chat.id,
        messageId: msg.message_id,
        content: msg.text ?? "",
        author: {
          id: msg.from.id,
          username: msg.from.username ?? "",
          firstName: msg.from.first_name,
          isBot: false,
        },
        timestamp: msg.date,
      })
    );

    return c.json({ ok: true });
  } catch (error) {
    console.error(
      "[TelegramWebhook] Error processing update:",
      error instanceof Error ? error.message : String(error)
    );
    // Always return 200 to Telegram to prevent retries
    return c.json({ ok: true });
  }
});

interface TelegramMessagePayload {
  telegramBotId: string;
  chatId: number;
  messageId: number;
  content: string;
  author: {
    id: number;
    username: string;
    firstName: string;
    isBot: boolean;
  };
  timestamp: number;
}

async function dispatchWorkflows(
  env: ApiContext["Bindings"],
  telegramBotId: string,
  message: TelegramMessagePayload
): Promise<void> {
  const db = createDatabase(env.DB);
  const chatIdStr = String(message.chatId);
  const allTriggers = await getBotTriggersByBot(
    db,
    telegramBotId,
    "chatId",
    chatIdStr
  );
  if (allTriggers.length === 0) return;

  const workflowStore = new WorkflowStore(env);

  for (const { botTrigger, workflow } of allTriggers) {
    try {
      if (!botTrigger.botId) {
        console.error(
          `[TelegramWebhook] Trigger for workflow ${workflow.id} has no botId, skipping`
        );
        continue;
      }

      let perBotToken: string;
      try {
        const bot = await getBot(db, botTrigger.botId, workflow.organizationId);
        if (!bot) {
          console.error(
            `[TelegramWebhook] Bot ${botTrigger.botId} not found for workflow ${workflow.id}, skipping`
          );
          continue;
        }
        perBotToken = await decryptSecret(
          bot.encryptedToken,
          env,
          workflow.organizationId
        );
      } catch (error) {
        console.error(
          `[TelegramWebhook] Failed to resolve bot token for workflow ${workflow.id}:`,
          error instanceof Error ? error.message : String(error)
        );
        continue;
      }

      await executeWorkflow(env, workflow, message, workflowStore, perBotToken);
    } catch (error) {
      console.error(
        `[TelegramWebhook] Failed to trigger workflow ${workflow.id}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

async function executeWorkflow(
  env: ApiContext["Bindings"],
  workflow: {
    id: string;
    name: string;
    trigger: string;
    organizationId: string;
    enabled: boolean;
  },
  message: TelegramMessagePayload,
  workflowStore: WorkflowStore,
  perBotToken?: string
): Promise<void> {
  const db = createDatabase(env.DB);
  const organizationId = workflow.organizationId;

  let workflowData: Workflow;

  try {
    const workflowWithData = await workflowStore.getWithData(
      workflow.id,
      organizationId
    );
    if (!workflowWithData?.data) {
      console.error(
        `[TelegramWebhook] Failed to load workflow data for ${workflow.id}`
      );
      return;
    }
    workflowData = workflowWithData.data;
  } catch (error) {
    console.error(
      `[TelegramWebhook] Failed to load workflow ${workflow.id}:`,
      error
    );
    return;
  }

  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    console.error(
      `[TelegramWebhook] Workflow ${workflow.id} has no nodes, skipping`
    );
    return;
  }

  const billingInfo = await getOrganizationBillingInfo(db, organizationId);
  if (billingInfo === undefined) {
    console.error("[TelegramWebhook] Organization not found");
    return;
  }

  const executionParams = {
    userId: "telegram_trigger",
    organizationId,
    computeCredits: billingInfo.computeCredits,
    userPlan: resolveOrganizationPlan(billingInfo, env.CLOUDFLARE_ENV),
    workflow: {
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger as WorkflowTrigger,
      runtime: workflowData.runtime,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    },
    telegramMessage: {
      telegramBotId: message.telegramBotId,
      chatId: message.chatId,
      messageId: message.messageId,
      content: message.content,
      author: message.author,
      timestamp: message.timestamp,
    },
    ...(perBotToken ? { telegramBotToken: perBotToken } : {}),
  };

  if (workflowData.runtime === "worker") {
    const workerRuntime = createWorkerRuntime(env);
    const execution = await workerRuntime.execute(executionParams);
    console.log(
      `[Execution] ${execution.id} workflow=${workflow.id} runtime=worker trigger=telegram status=${execution.status} error=${execution.error ?? "none"}`
    );
  } else {
    const agent = await getAgentByName(env.WORKFLOW_AGENT, workflow.id);
    const executionId = await agent.executeWorkflow(executionParams);
    console.log(
      `[Execution] ${executionId} workflow=${workflow.id} runtime=workflow trigger=telegram`
    );
  }
}

export default telegramWebhook;
