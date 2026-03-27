import type { Workflow, WorkflowTrigger } from "@dafthunk/types";
import { Hono } from "hono";

import type { ApiContext } from "../context";
import {
  createDatabase,
  getDiscordBot,
  getDiscordBotById,
  getDiscordTriggersByBot,
  getOrganizationBillingInfo,
  resolveOrganizationPlan,
} from "../db";
import { getAgentByName } from "../durable-objects/agent-utils";
import { createWorkerRuntime } from "../runtime/cloudflare-worker-runtime";
import { WorkflowStore } from "../stores/workflow-store";
import { decryptSecret } from "../utils/encryption";

const discordWebhook = new Hono<ApiContext>();

/**
 * Verify Ed25519 signature from Discord using Web Crypto API.
 */
async function verifyDiscordSignature(
  publicKeyHex: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  try {
    const publicKeyBytes = hexToUint8Array(publicKeyHex);
    const signatureBytes = hexToUint8Array(signature);
    const message = new TextEncoder().encode(timestamp + body);

    const key = await crypto.subtle.importKey(
      "raw",
      publicKeyBytes,
      { name: "Ed25519", namedCurve: "Ed25519" },
      false,
      ["verify"]
    );

    return await crypto.subtle.verify("Ed25519", key, signatureBytes, message);
  } catch {
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Public webhook endpoint called by Discord with interactions.
 * Routed by discordBotId. Authenticated via Ed25519 signature verification.
 */
discordWebhook.post("/webhook/:discordBotId", async (c) => {
  const discordBotId = c.req.param("discordBotId");
  console.log(`[DiscordWebhook] Received request for bot ${discordBotId}`);
  const db = createDatabase(c.env.DB);

  // Look up bot to get public key
  const bot = await getDiscordBotById(db, discordBotId);
  if (!bot || !bot.publicKey) {
    console.error(
      `[DiscordWebhook] Bot not found or missing public key: ${discordBotId}, hasBot=${!!bot}, hasKey=${!!bot?.publicKey}`
    );
    return c.json({ error: "Bot not found" }, 404);
  }

  // Verify Ed25519 signature
  const signature = c.req.header("X-Signature-Ed25519");
  const timestamp = c.req.header("X-Signature-Timestamp");
  const rawBody = await c.req.text();

  if (!signature || !timestamp) {
    console.error("[DiscordWebhook] Missing signature headers");
    return c.json({ error: "Missing signature headers" }, 401);
  }

  const isValid = await verifyDiscordSignature(
    bot.publicKey,
    signature,
    timestamp,
    rawBody
  );

  if (!isValid) {
    console.error("[DiscordWebhook] Invalid signature verification");
    return c.json({ error: "Invalid signature" }, 401);
  }

  console.log("[DiscordWebhook] Signature verified successfully");

  try {
    const interaction = JSON.parse(rawBody) as {
      type: number;
      id: string;
      token: string;
      application_id: string;
      data?: {
        name: string;
        options?: Array<{
          name: string;
          type: number;
          value: string | number | boolean;
        }>;
      };
      guild_id?: string;
      channel_id?: string;
      member?: { user: { id: string; username: string; global_name?: string } };
      user?: { id: string; username: string; global_name?: string };
    };

    console.log(
      `[DiscordWebhook] Interaction type=${interaction.type} data=${!!interaction.data}`
    );

    // Type 1: PING — Discord endpoint verification handshake
    if (interaction.type === 1) {
      return c.json({ type: 1 });
    }

    // Type 2: APPLICATION_COMMAND — slash command invocation
    if (interaction.type === 2 && interaction.data) {
      const commandName = interaction.data.name;
      const options: Record<string, string | number | boolean> = {};
      for (const opt of interaction.data.options ?? []) {
        options[opt.name] = opt.value;
      }

      const user = interaction.member?.user ?? interaction.user;

      // Dispatch workflows in the background
      const env = c.env;
      c.executionCtx.waitUntil(
        dispatchWorkflows(env, discordBotId, {
          discordBotId,
          interactionId: interaction.id,
          interactionToken: interaction.token,
          applicationId: interaction.application_id,
          commandName,
          options,
          guildId: interaction.guild_id,
          channelId: interaction.channel_id,
          user: {
            id: user?.id ?? "",
            username: user?.username ?? "",
            globalName: user?.global_name,
          },
        })
      );

      // Respond with DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE (type 5)
      // Bot shows "thinking" while the workflow executes
      return c.json({ type: 5 });
    }

    // Other interaction types — acknowledge
    return c.json({ type: 1 });
  } catch (error) {
    console.error(
      "[DiscordWebhook] Error processing interaction:",
      error instanceof Error ? error.message : String(error)
    );
    // Return DEFERRED response to prevent "application did not respond" errors
    // even when processing fails — the user will just see no follow-up
    return c.json({ type: 5 });
  }
});

interface DiscordInteractionPayload {
  discordBotId: string;
  interactionId: string;
  interactionToken: string;
  applicationId: string;
  commandName: string;
  options: Record<string, string | number | boolean>;
  guildId?: string;
  channelId?: string;
  user: { id: string; username: string; globalName?: string };
}

async function dispatchWorkflows(
  env: ApiContext["Bindings"],
  discordBotId: string,
  interaction: DiscordInteractionPayload
): Promise<void> {
  const db = createDatabase(env.DB);
  const triggers = await getDiscordTriggersByBot(
    db,
    discordBotId,
    interaction.commandName
  );
  if (triggers.length === 0) return;

  const workflowStore = new WorkflowStore(env);

  for (const { workflow } of triggers) {
    try {
      // Resolve per-bot token for workflow execution
      let perBotToken: string;
      try {
        const bot = await getDiscordBot(
          db,
          discordBotId,
          workflow.organizationId
        );
        if (!bot) {
          console.error(
            `[DiscordWebhook] Bot ${discordBotId} not found for workflow ${workflow.id}, skipping`
          );
          continue;
        }
        perBotToken = await decryptSecret(
          bot.encryptedBotToken,
          env,
          workflow.organizationId
        );
      } catch (error) {
        console.error(
          `[DiscordWebhook] Failed to resolve bot token for workflow ${workflow.id}:`,
          error instanceof Error ? error.message : String(error)
        );
        continue;
      }

      await executeWorkflow(
        env,
        workflow,
        interaction,
        workflowStore,
        perBotToken
      );
    } catch (error) {
      console.error(
        `[DiscordWebhook] Failed to trigger workflow ${workflow.id}:`,
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
  interaction: DiscordInteractionPayload,
  workflowStore: WorkflowStore,
  perBotToken: string
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
        `[DiscordWebhook] Failed to load workflow data for ${workflow.id}`
      );
      return;
    }
    workflowData = workflowWithData.data;
  } catch (error) {
    console.error(
      `[DiscordWebhook] Failed to load workflow ${workflow.id}:`,
      error
    );
    return;
  }

  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    console.error(
      `[DiscordWebhook] Workflow ${workflow.id} has no nodes, skipping`
    );
    return;
  }

  const billingInfo = await getOrganizationBillingInfo(db, organizationId);
  if (billingInfo === undefined) {
    console.error("[DiscordWebhook] Organization not found");
    return;
  }

  const executionParams = {
    userId: "discord_trigger",
    organizationId,
    computeCredits: billingInfo.computeCredits,
    userPlan: resolveOrganizationPlan(billingInfo),
    workflow: {
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger as WorkflowTrigger,
      runtime: workflowData.runtime,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    },
    discordInteraction: {
      discordBotId: interaction.discordBotId,
      interactionId: interaction.interactionId,
      interactionToken: interaction.interactionToken,
      applicationId: interaction.applicationId,
      commandName: interaction.commandName,
      options: interaction.options,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      user: interaction.user,
    },
    discordBotToken: perBotToken,
  };

  if (workflowData.runtime === "worker") {
    const workerRuntime = createWorkerRuntime(env);
    const execution = await workerRuntime.execute(executionParams);
    console.log(
      `[Execution] ${execution.id} workflow=${workflow.id} runtime=worker trigger=discord status=${execution.status} error=${execution.error ?? "none"}`
    );
  } else {
    const agent = await getAgentByName(env.WORKFLOW_AGENT, workflow.id);
    const executionId = await agent.executeWorkflow(executionParams);
    console.log(
      `[Execution] ${executionId} workflow=${workflow.id} runtime=workflow trigger=discord`
    );
  }
}

export default discordWebhook;
