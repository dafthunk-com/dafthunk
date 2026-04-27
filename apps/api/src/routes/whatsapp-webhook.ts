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

const whatsappWebhook = new Hono<ApiContext>();

/**
 * GET webhook endpoint for Meta verification challenge-response.
 * When configuring a webhook in the Meta Developer Portal, Meta sends a GET request
 * with hub.mode, hub.verify_token, and hub.challenge query parameters.
 */
whatsappWebhook.get("/webhook/:whatsappAccountId", async (c) => {
  const whatsappAccountId = c.req.param("whatsappAccountId");
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return c.json({ error: "Invalid verification request" }, 400);
  }

  const db = createDatabase(c.env.DB);
  // Find verify token from trigger metadata, then fall back to bot metadata
  const triggers = await getBotTriggersByBot(db, whatsappAccountId);
  let expectedToken: string | undefined;
  const firstMeta = triggers[0]?.botTrigger.metadata
    ? (JSON.parse(triggers[0].botTrigger.metadata) as {
        verifyToken?: string;
      })
    : null;
  expectedToken = firstMeta?.verifyToken;

  if (!expectedToken) {
    const bot = await getBotById(db, whatsappAccountId);
    const botMeta = bot?.metadata
      ? (JSON.parse(bot.metadata) as { verifyToken?: string })
      : null;
    expectedToken = botMeta?.verifyToken;
  }

  if (!expectedToken || token !== expectedToken) {
    return c.json({ error: "Verification token mismatch" }, 403);
  }

  // Return the challenge string as plain text to complete verification
  return c.text(challenge);
});

/**
 * POST webhook endpoint called by Meta with WhatsApp message updates.
 * Verifies X-Hub-Signature-256 header using HMAC-SHA256 with app secret.
 */
whatsappWebhook.post("/webhook/:whatsappAccountId", async (c) => {
  const whatsappAccountId = c.req.param("whatsappAccountId");
  const db = createDatabase(c.env.DB);

  try {
    // Get the raw body for signature verification
    const rawBody = await c.req.text();

    // Always verify the X-Hub-Signature-256 header (HMAC-SHA256 with app secret).
    // Reject requests without the header to prevent forged webhook payloads.
    const signature = c.req.header("X-Hub-Signature-256");
    if (!signature) {
      return c.json({ error: "Missing signature" }, 401);
    }

    const isValid = await verifySignature(
      c.env,
      db,
      whatsappAccountId,
      rawBody,
      signature
    );
    if (!isValid) {
      return c.json({ error: "Invalid signature" }, 401);
    }

    const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;

    // Process each entry
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const value = change.value;
        if (!value?.messages) continue;

        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        for (const msg of value.messages) {
          // Skip status updates
          if (!msg.from || !msg.id) continue;

          const contactName =
            value.contacts?.find((ct) => ct.wa_id === msg.from)?.profile
              ?.name ?? "";

          const env = c.env;
          c.executionCtx.waitUntil(
            dispatchWorkflows(env, whatsappAccountId, {
              whatsappAccountId,
              phoneNumberId,
              from: msg.from,
              messageId: msg.id,
              content: msg.text?.body ?? "",
              timestamp: Number(msg.timestamp),
              author: { phoneNumber: msg.from, name: contactName },
              messageType: msg.type ?? "text",
            })
          );
        }
      }
    }

    return c.json({ ok: true });
  } catch (error) {
    console.error(
      "[WhatsAppWebhook] Error processing update:",
      error instanceof Error ? error.message : String(error)
    );
    // Always return 200 to prevent Meta from retrying
    return c.json({ ok: true });
  }
});

// ── Webhook payload types ──────────────────────────────────────────────

interface WhatsAppWebhookPayload {
  object: string;
  entry?: {
    id: string;
    changes?: {
      field: string;
      value: {
        messaging_product: string;
        metadata?: { phone_number_id: string; display_phone_number: string };
        contacts?: { wa_id: string; profile?: { name: string } }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          type?: string;
          text?: { body: string };
        }[];
      };
    }[];
  }[];
}

interface WhatsAppMessagePayload {
  whatsappAccountId: string;
  phoneNumberId: string;
  from: string;
  messageId: string;
  content: string;
  timestamp: number;
  author: { phoneNumber: string; name: string };
  messageType: string;
}

// ── Signature verification ─────────────────────────────────────────────

async function verifySignature(
  env: ApiContext["Bindings"],
  db: ReturnType<typeof import("../db").createDatabase>,
  whatsappAccountId: string,
  rawBody: string,
  signature: string
): Promise<boolean> {
  try {
    // Find the bot to get the encrypted app secret
    // We need to check without org scoping since webhook is unauthenticated
    const bot = await getBotById(db, whatsappAccountId);
    if (!bot?.encryptedMetadata) return false;

    const encMeta = JSON.parse(bot.encryptedMetadata) as {
      encryptedAppSecret?: string;
    };
    if (!encMeta.encryptedAppSecret) return false;

    const appSecret = await decryptSecret(
      encMeta.encryptedAppSecret,
      env,
      bot.organizationId
    );

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expectedSignature = `sha256=${Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;

    return signature === expectedSignature;
  } catch (error) {
    console.error(
      "[WhatsAppWebhook] Signature verification error:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

// ── Workflow dispatch ──────────────────────────────────────────────────

async function dispatchWorkflows(
  env: ApiContext["Bindings"],
  whatsappAccountId: string,
  message: WhatsAppMessagePayload
): Promise<void> {
  const db = createDatabase(env.DB);
  const allTriggers = await getBotTriggersByBot(db, whatsappAccountId);
  if (allTriggers.length === 0) return;

  const workflowStore = new WorkflowStore(env);

  for (const { botTrigger, workflow } of allTriggers) {
    try {
      if (!botTrigger.botId) {
        console.error(
          `[WhatsAppWebhook] Trigger for workflow ${workflow.id} has no botId, skipping`
        );
        continue;
      }

      let accessToken: string;
      try {
        const bot = await getBot(db, botTrigger.botId, workflow.organizationId);
        if (!bot) {
          console.error(
            `[WhatsAppWebhook] Bot ${botTrigger.botId} not found for workflow ${workflow.id}, skipping`
          );
          continue;
        }
        accessToken = await decryptSecret(
          bot.encryptedToken,
          env,
          workflow.organizationId
        );
      } catch (error) {
        console.error(
          `[WhatsAppWebhook] Failed to resolve access token for workflow ${workflow.id}:`,
          error instanceof Error ? error.message : String(error)
        );
        continue;
      }

      await executeWorkflow(env, workflow, message, workflowStore, accessToken);
    } catch (error) {
      console.error(
        `[WhatsAppWebhook] Failed to trigger workflow ${workflow.id}:`,
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
  message: WhatsAppMessagePayload,
  workflowStore: WorkflowStore,
  accessToken: string
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
        `[WhatsAppWebhook] Failed to load workflow data for ${workflow.id}`
      );
      return;
    }
    workflowData = workflowWithData.data;
  } catch (error) {
    console.error(
      `[WhatsAppWebhook] Failed to load workflow ${workflow.id}:`,
      error
    );
    return;
  }

  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    console.error(
      `[WhatsAppWebhook] Workflow ${workflow.id} has no nodes, skipping`
    );
    return;
  }

  const billingInfo = await getOrganizationBillingInfo(db, organizationId);
  if (billingInfo === undefined) {
    console.error("[WhatsAppWebhook] Organization not found");
    return;
  }

  const executionParams = {
    userId: "whatsapp_trigger",
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
    whatsappMessage: {
      whatsappAccountId: message.whatsappAccountId,
      phoneNumberId: message.phoneNumberId,
      from: message.from,
      messageId: message.messageId,
      content: message.content,
      timestamp: message.timestamp,
      author: message.author,
      messageType: message.messageType,
    },
    whatsappAccessToken: accessToken,
    whatsappPhoneNumberId: message.phoneNumberId,
  };

  if (workflowData.runtime === "worker") {
    const workerRuntime = createWorkerRuntime(env);
    const execution = await workerRuntime.execute(executionParams);
    console.log(
      `[Execution] ${execution.id} workflow=${workflow.id} runtime=worker trigger=whatsapp status=${execution.status} error=${execution.error ?? "none"}`
    );
  } else {
    const agent = await getAgentByName(env.WORKFLOW_AGENT, workflow.id);
    const executionId = await agent.executeWorkflow(executionParams);
    console.log(
      `[Execution] ${executionId} workflow=${workflow.id} runtime=workflow trigger=whatsapp`
    );
  }
}

export default whatsappWebhook;
