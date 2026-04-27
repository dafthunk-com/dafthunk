import type { Workflow, WorkflowTrigger } from "@dafthunk/types";
import { Hono } from "hono";

import type { ApiContext } from "../context";
import {
  createDatabase,
  getBot,
  getBotById,
  getBotTriggersByBot,
  getOrganizationBillingInfo,
  resolveOrganizationBillingOptions,
} from "../db";
import { getAgentByName } from "../durable-objects/agent-utils";
import { createWorkerRuntime } from "../runtime/cloudflare-worker-runtime";
import { WorkflowStore } from "../stores/workflow-store";
import { decryptSecret } from "../utils/encryption";

const slackWebhook = new Hono<ApiContext>();

/**
 * Verify Slack request signature using HMAC-SHA256.
 */
async function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  try {
    const baseString = `v0:${timestamp}:${body}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(signingSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(baseString)
    );
    const expectedSignature = `v0=${Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
    return signature === expectedSignature;
  } catch {
    return false;
  }
}

/**
 * Public webhook endpoint called by Slack with events.
 * Routed by slackBotId. Authenticated via HMAC-SHA256 signature verification.
 */
slackWebhook.post("/webhook/:slackBotId", async (c) => {
  const slackBotId = c.req.param("slackBotId");
  console.log(`[SlackWebhook] Received request for bot ${slackBotId}`);
  const db = createDatabase(c.env.DB);

  // Look up bot to get signing secret from encrypted metadata
  const bot = await getBotById(db, slackBotId);
  if (!bot) {
    console.error(`[SlackWebhook] Bot not found: ${slackBotId}`);
    return c.json({ error: "Bot not found" }, 404);
  }

  const encMeta = bot.encryptedMetadata
    ? (JSON.parse(bot.encryptedMetadata) as {
        encryptedSigningSecret?: string;
      })
    : null;
  if (!encMeta?.encryptedSigningSecret) {
    console.error(`[SlackWebhook] Bot ${slackBotId} missing signing secret`);
    return c.json({ error: "Bot configuration error" }, 500);
  }

  const signingSecret = await decryptSecret(
    encMeta.encryptedSigningSecret,
    c.env,
    bot.organizationId
  );

  // Verify HMAC-SHA256 signature
  const signature = c.req.header("X-Slack-Signature");
  const timestamp = c.req.header("X-Slack-Request-Timestamp");
  const rawBody = await c.req.text();

  if (!signature || !timestamp) {
    console.error("[SlackWebhook] Missing signature headers");
    return c.json({ error: "Missing signature headers" }, 401);
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) {
    console.error("[SlackWebhook] Request timestamp too old");
    return c.json({ error: "Request too old" }, 401);
  }

  const isValid = await verifySlackSignature(
    signingSecret,
    signature,
    timestamp,
    rawBody
  );

  if (!isValid) {
    console.error("[SlackWebhook] Invalid signature verification");
    return c.json({ error: "Invalid signature" }, 401);
  }

  console.log("[SlackWebhook] Signature verified successfully");

  try {
    const payload = JSON.parse(rawBody) as {
      type: string;
      challenge?: string;
      event?: {
        type: string;
        channel: string;
        user?: string;
        text?: string;
        ts: string;
        thread_ts?: string;
        bot_id?: string;
        subtype?: string;
      };
    };

    // URL verification challenge
    if (payload.type === "url_verification") {
      return c.json({ challenge: payload.challenge });
    }

    // Event callback
    if (payload.type === "event_callback" && payload.event) {
      const event = payload.event;

      // Only handle message events, skip bot messages and subtypes
      if (
        event.type !== "message" ||
        event.bot_id ||
        event.subtype ||
        !event.user
      ) {
        return c.json({ ok: true });
      }

      // Dispatch workflows in the background
      const env = c.env;
      c.executionCtx.waitUntil(
        dispatchWorkflows(env, slackBotId, {
          slackBotId,
          channelId: event.channel,
          threadTs: event.thread_ts,
          messageTs: event.ts,
          content: event.text ?? "",
          userId: event.user,
          username: "",
          timestamp: event.ts,
        })
      );

      return c.json({ ok: true });
    }

    // Other event types — acknowledge
    return c.json({ ok: true });
  } catch (error) {
    console.error(
      "[SlackWebhook] Error processing event:",
      error instanceof Error ? error.message : String(error)
    );
    // Always return 200 to Slack to prevent retries
    return c.json({ ok: true });
  }
});

interface SlackMessagePayload {
  slackBotId: string;
  channelId: string;
  threadTs?: string;
  messageTs: string;
  content: string;
  userId: string;
  username: string;
  timestamp: string;
}

async function dispatchWorkflows(
  env: ApiContext["Bindings"],
  slackBotId: string,
  message: SlackMessagePayload
): Promise<void> {
  const db = createDatabase(env.DB);
  const allTriggers = await getBotTriggersByBot(
    db,
    slackBotId,
    "channelId",
    message.channelId
  );
  if (allTriggers.length === 0) return;

  const workflowStore = new WorkflowStore(env);

  for (const { workflow } of allTriggers) {
    try {
      // Resolve per-bot token for workflow execution
      let perBotToken: string;
      try {
        const bot = await getBot(db, slackBotId, workflow.organizationId);
        if (!bot) {
          console.error(
            `[SlackWebhook] Bot ${slackBotId} not found for workflow ${workflow.id}, skipping`
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
          `[SlackWebhook] Failed to resolve bot token for workflow ${workflow.id}:`,
          error instanceof Error ? error.message : String(error)
        );
        continue;
      }

      await executeWorkflow(env, workflow, message, workflowStore, perBotToken);
    } catch (error) {
      console.error(
        `[SlackWebhook] Failed to trigger workflow ${workflow.id}:`,
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
  message: SlackMessagePayload,
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
        `[SlackWebhook] Failed to load workflow data for ${workflow.id}`
      );
      return;
    }
    workflowData = workflowWithData.data;
  } catch (error) {
    console.error(
      `[SlackWebhook] Failed to load workflow ${workflow.id}:`,
      error
    );
    return;
  }

  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    console.error(
      `[SlackWebhook] Workflow ${workflow.id} has no nodes, skipping`
    );
    return;
  }

  const billingInfo = await getOrganizationBillingInfo(db, organizationId);
  if (billingInfo === undefined) {
    console.error("[SlackWebhook] Organization not found");
    return;
  }

  const executionParams = {
    userId: "slack_trigger",
    organizationId,
    ...resolveOrganizationBillingOptions(billingInfo, env.CLOUDFLARE_ENV),
    workflow: {
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.trigger as WorkflowTrigger,
      runtime: workflowData.runtime,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    },
    slackMessage: {
      slackBotId: message.slackBotId,
      channelId: message.channelId,
      threadTs: message.threadTs,
      messageTs: message.messageTs,
      content: message.content,
      userId: message.userId,
      username: message.username,
      timestamp: message.timestamp,
    },
    slackBotToken: perBotToken,
  };

  if (workflowData.runtime === "worker") {
    const workerRuntime = createWorkerRuntime(env);
    const execution = await workerRuntime.execute(executionParams);
    console.log(
      `[Execution] ${execution.id} workflow=${workflow.id} runtime=worker trigger=slack status=${execution.status} error=${execution.error ?? "none"}`
    );
  } else {
    const agent = await getAgentByName(env.WORKFLOW_AGENT, workflow.id);
    const executionId = await agent.executeWorkflow(executionParams);
    console.log(
      `[Execution] ${executionId} workflow=${workflow.id} runtime=workflow trigger=slack`
    );
  }
}

export default slackWebhook;
