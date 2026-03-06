import type { Workflow, WorkflowTrigger } from "@dafthunk/types";
import { Hono } from "hono";

import type { ApiContext } from "../context";
import {
  createDatabase,
  getOrganizationComputeCredits,
  getTelegramSecretTokenByChat,
  getTelegramTriggersByChat,
} from "../db";
import { createWorkerRuntime } from "../runtime/cloudflare-worker-runtime";
import { DeploymentStore } from "../stores/deployment-store";
import { WorkflowStore } from "../stores/workflow-store";

const telegramWebhook = new Hono<ApiContext>();

/**
 * Public webhook endpoint called by Telegram with updates.
 * Authenticated via the secret_token registered with Telegram's setWebhook API.
 */
telegramWebhook.post("/webhook/:chatId", async (c) => {
  const chatId = c.req.param("chatId");
  const db = createDatabase(c.env.DB);

  // Verify the secret token sent by Telegram
  const incomingToken = c.req.header("X-Telegram-Bot-Api-Secret-Token");
  const expectedToken = await getTelegramSecretTokenByChat(db, chatId);

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
      dispatchWorkflows(env, {
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
        chatIdStr: String(msg.chat.id),
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
  chatIdStr: string;
}

async function dispatchWorkflows(
  env: ApiContext["Bindings"],
  message: TelegramMessagePayload
): Promise<void> {
  const db = createDatabase(env.DB);
  const triggers = await getTelegramTriggersByChat(db, message.chatIdStr);
  if (triggers.length === 0) return;

  const workflowStore = new WorkflowStore(env);
  const deploymentStore = new DeploymentStore(env);

  for (const { workflow } of triggers) {
    try {
      await executeWorkflow(
        env,
        workflow,
        message,
        workflowStore,
        deploymentStore
      );
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
    handle: string;
    trigger: string;
    organizationId: string;
    activeDeploymentId: string | null;
  },
  message: TelegramMessagePayload,
  workflowStore: WorkflowStore,
  deploymentStore: DeploymentStore
): Promise<void> {
  const db = createDatabase(env.DB);
  const organizationId = workflow.organizationId;

  let workflowData: Workflow;
  let deploymentId: string | undefined;

  if (workflow.activeDeploymentId) {
    try {
      workflowData = await deploymentStore.readWorkflowSnapshot(
        workflow.activeDeploymentId
      );
      deploymentId = workflow.activeDeploymentId;
    } catch (error) {
      console.error(
        `[TelegramWebhook] Failed to load deployment ${workflow.activeDeploymentId}:`,
        error
      );
      return;
    }
  } else {
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
  }

  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    console.error(
      `[TelegramWebhook] Workflow ${workflow.id} has no nodes, skipping`
    );
    return;
  }

  const computeCredits = await getOrganizationComputeCredits(
    db,
    organizationId
  );
  if (computeCredits === undefined) {
    console.error("[TelegramWebhook] Organization not found");
    return;
  }

  const executionParams = {
    userId: "telegram_trigger",
    organizationId,
    computeCredits,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      handle: workflow.handle,
      trigger: workflow.trigger as WorkflowTrigger,
      runtime: workflowData.runtime,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    },
    deploymentId,
    telegramMessage: {
      chatId: message.chatId,
      messageId: message.messageId,
      content: message.content,
      author: message.author,
      timestamp: message.timestamp,
    },
  };

  if (workflowData.runtime === "worker") {
    const workerRuntime = createWorkerRuntime(env);
    const execution = await workerRuntime.execute(executionParams);
    console.log(
      `[Execution] ${execution.id} workflow=${workflow.id} runtime=worker trigger=telegram`
    );
  } else {
    const executionInstance = await env.EXECUTE.create({
      params: executionParams,
    });
    console.log(
      `[Execution] ${executionInstance.id} workflow=${workflow.id} runtime=workflow trigger=telegram`
    );
  }
}

export default telegramWebhook;
