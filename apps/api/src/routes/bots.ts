import type {
  BotProvider,
  BotResponse,
  CreateBotRequest,
  DeleteBotResponse,
  GetBotResponse,
  GetBotWebhookInfoResponse,
  ListBotsResponse,
  UpdateBotRequest,
  UpdateBotResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import {
  createBot,
  createDatabase,
  deleteBot,
  getBot,
  getBots,
  getBotTriggersByBot,
  updateBot,
} from "../db";
import { encryptSecret } from "../utils/encryption";

const botRoutes = new Hono<ApiContext>();

botRoutes.use("*", jwtMiddleware);

function toBotResponse(bot: {
  id: string;
  name: string;
  provider: string;
  tokenLastFour: string;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BotResponse {
  return {
    id: bot.id,
    name: bot.name,
    provider: bot.provider as BotProvider,
    tokenLastFour: bot.tokenLastFour,
    metadata: bot.metadata ? JSON.parse(bot.metadata) : null,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  };
}

// Validate token by calling provider API
async function validateToken(
  provider: BotProvider,
  token: string,
  extra?: { phoneNumberId?: string }
): Promise<
  | { ok: true; providerData?: Record<string, string | null> }
  | { ok: false; error: string }
> {
  switch (provider) {
    case "discord": {
      const res = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bot ${token}` },
      });
      if (!res.ok)
        return {
          ok: false,
          error: "Invalid bot token. Please check your Discord bot token.",
        };
      return { ok: true };
    }
    case "telegram": {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      if (!res.ok)
        return {
          ok: false,
          error: "Invalid bot token. Please check your Telegram bot token.",
        };
      const data = (await res.json()) as {
        ok: boolean;
        result?: { username?: string };
      };
      return {
        ok: true,
        providerData: { botUsername: data.result?.username ?? null },
      };
    }
    case "whatsapp": {
      const phoneNumberId = extra?.phoneNumberId;
      if (!phoneNumberId)
        return { ok: false, error: "Phone number ID is required." };
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok)
        return {
          ok: false,
          error:
            "Invalid access token or phone number ID. Please check your WhatsApp Business API credentials.",
        };
      return { ok: true };
    }
    case "slack": {
      const res = await fetch("https://slack.com/api/auth.test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok)
        return {
          ok: false,
          error: "Failed to validate bot token with Slack API.",
        };
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        team_id?: string;
        team?: string;
        app_id?: string;
      };
      if (!data.ok)
        return {
          ok: false,
          error: `Invalid bot token: ${data.error ?? "unknown error"}`,
        };
      return {
        ok: true,
        providerData: {
          appId: data.app_id ?? null,
          teamId: data.team_id ?? null,
          teamName: data.team ?? null,
        },
      };
    }
  }
}

// Build metadata JSON from request fields
function buildMetadata(
  provider: BotProvider,
  data: CreateBotRequest,
  providerData?: Record<string, string | null>
): string | null {
  switch (provider) {
    case "discord":
      return JSON.stringify({
        applicationId: data.applicationId,
        publicKey: data.publicKey,
      });
    case "telegram":
      return JSON.stringify({
        botUsername: providerData?.botUsername ?? null,
      });
    case "whatsapp":
      return JSON.stringify({
        phoneNumberId: data.phoneNumberId,
        wabaId: data.wabaId ?? null,
        verifyToken: crypto.randomUUID(),
      });
    case "slack":
      return JSON.stringify({
        appId: providerData?.appId ?? null,
        teamId: providerData?.teamId ?? null,
        teamName: providerData?.teamName ?? null,
      });
  }
}

// Build encrypted metadata JSON from request fields
async function buildEncryptedMetadata(
  provider: BotProvider,
  data: CreateBotRequest,
  env: ApiContext["Bindings"],
  organizationId: string
): Promise<string | null> {
  switch (provider) {
    case "whatsapp":
      if (!data.appSecret) return null;
      return JSON.stringify({
        encryptedAppSecret: await encryptSecret(
          data.appSecret,
          env,
          organizationId
        ),
      });
    case "slack":
      if (!data.signingSecret) return null;
      return JSON.stringify({
        encryptedSigningSecret: await encryptSecret(
          data.signingSecret,
          env,
          organizationId
        ),
      });
    default:
      return null;
  }
}

botRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;
  const provider = c.req.query("provider") as BotProvider | undefined;

  const allBots = await getBots(db, organizationId, provider);

  const response: ListBotsResponse = {
    bots: allBots.map(toBotResponse),
  };
  return c.json(response);
});

botRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Bot name is required"),
      provider: z.enum(["discord", "telegram", "whatsapp", "slack"]),
      token: z.string().min(1, "Token is required"),
      applicationId: z.string().optional(),
      publicKey: z.string().optional(),
      phoneNumberId: z.string().optional(),
      wabaId: z.string().optional(),
      appSecret: z.string().optional(),
      signingSecret: z.string().optional(),
    }) as z.ZodType<CreateBotRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    // Provider-specific field validation
    if (data.provider === "discord") {
      if (!data.applicationId)
        return c.json({ error: "Application ID is required for Discord" }, 400);
      if (!data.publicKey)
        return c.json({ error: "Public key is required for Discord" }, 400);
    }
    if (data.provider === "whatsapp") {
      if (!data.phoneNumberId)
        return c.json(
          { error: "Phone number ID is required for WhatsApp" },
          400
        );
      if (!data.appSecret)
        return c.json({ error: "App secret is required for WhatsApp" }, 400);
    }
    if (data.provider === "slack") {
      if (!data.signingSecret)
        return c.json({ error: "Signing secret is required for Slack" }, 400);
    }

    const validation = await validateToken(data.provider, data.token, {
      phoneNumberId: data.phoneNumberId,
    });
    if (!validation.ok) return c.json({ error: validation.error }, 400);

    const now = new Date();
    const botId = uuid();
    const encryptedToken = await encryptSecret(
      data.token,
      c.env,
      organizationId
    );
    const metadata = buildMetadata(
      data.provider,
      data,
      validation.providerData
    );
    const encryptedMetadata = await buildEncryptedMetadata(
      data.provider,
      data,
      c.env,
      organizationId
    );

    const newBot = await createBot(db, {
      id: botId,
      name: data.name || "Untitled Bot",
      provider: data.provider,
      encryptedToken,
      tokenLastFour: data.token.slice(-4),
      metadata,
      encryptedMetadata,
      organizationId,
      createdAt: now,
      updatedAt: now,
    });

    return c.json(toBotResponse(newBot), 201);
  }
);

botRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const bot = await getBot(db, id, organizationId);
  if (!bot) return c.json({ error: "Bot not found" }, 404);

  const response: GetBotResponse = toBotResponse(bot);
  return c.json(response);
});

botRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      token: z.string().min(1).optional(),
      publicKey: z.string().optional(),
      phoneNumberId: z.string().optional(),
      wabaId: z.string().optional(),
      appSecret: z.string().optional(),
      signingSecret: z.string().optional(),
    }) as z.ZodType<UpdateBotRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingBot = await getBot(db, id, organizationId);
    if (!existingBot) return c.json({ error: "Bot not found" }, 404);

    const data = c.req.valid("json");
    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (data.name) updateData.name = data.name;

    // If token changed, validate it
    if (data.token) {
      const existingMetadata = existingBot.metadata
        ? JSON.parse(existingBot.metadata)
        : {};
      const validation = await validateToken(existingBot.provider, data.token, {
        phoneNumberId: data.phoneNumberId ?? existingMetadata.phoneNumberId,
      });
      if (!validation.ok) return c.json({ error: validation.error }, 400);

      updateData.encryptedToken = await encryptSecret(
        data.token,
        c.env,
        organizationId
      );
      updateData.tokenLastFour = data.token.slice(-4);

      // Update metadata with provider data from validation (e.g. botUsername, teamId)
      if (validation.providerData) {
        const currentMetadata = existingBot.metadata
          ? JSON.parse(existingBot.metadata)
          : {};
        updateData.metadata = JSON.stringify({
          ...currentMetadata,
          ...validation.providerData,
        });
      }
    }

    // Update provider-specific metadata fields
    const metadataUpdates: Record<string, unknown> = {};
    if (data.publicKey !== undefined)
      metadataUpdates.publicKey = data.publicKey;
    if (data.phoneNumberId !== undefined)
      metadataUpdates.phoneNumberId = data.phoneNumberId;
    if (data.wabaId !== undefined) metadataUpdates.wabaId = data.wabaId;

    if (Object.keys(metadataUpdates).length > 0) {
      const currentMetadata = updateData.metadata
        ? JSON.parse(updateData.metadata as string)
        : existingBot.metadata
          ? JSON.parse(existingBot.metadata)
          : {};
      updateData.metadata = JSON.stringify({
        ...currentMetadata,
        ...metadataUpdates,
      });
    }

    // Update encrypted metadata fields
    if (data.appSecret) {
      const currentEncMeta = existingBot.encryptedMetadata
        ? JSON.parse(existingBot.encryptedMetadata)
        : {};
      currentEncMeta.encryptedAppSecret = await encryptSecret(
        data.appSecret,
        c.env,
        organizationId
      );
      updateData.encryptedMetadata = JSON.stringify(currentEncMeta);
    }
    if (data.signingSecret) {
      const currentEncMeta = existingBot.encryptedMetadata
        ? JSON.parse(existingBot.encryptedMetadata)
        : {};
      currentEncMeta.encryptedSigningSecret = await encryptSecret(
        data.signingSecret,
        c.env,
        organizationId
      );
      updateData.encryptedMetadata = JSON.stringify(currentEncMeta);
    }

    const updatedBot = await updateBot(
      db,
      id,
      organizationId,
      updateData as Partial<typeof existingBot>
    );

    const response: UpdateBotResponse = toBotResponse(updatedBot);
    return c.json(response);
  }
);

botRoutes.get("/:id/webhook-info", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const bot = await getBot(db, id, organizationId);
  if (!bot) return c.json({ error: "Bot not found" }, 404);

  const apiHost = new URL(c.req.url).origin;

  // Find verify token from trigger metadata, then fall back to bot metadata
  const triggers = await getBotTriggersByBot(db, id);
  let verifyToken: string | null = null;
  for (const t of triggers) {
    const meta = t.botTrigger.metadata
      ? JSON.parse(t.botTrigger.metadata)
      : null;
    if (meta?.verifyToken) {
      verifyToken = meta.verifyToken;
      break;
    }
    if (meta?.secretToken) {
      verifyToken = meta.secretToken;
      break;
    }
  }
  if (!verifyToken && bot.metadata) {
    const botMeta = JSON.parse(bot.metadata) as Record<string, string>;
    if (botMeta.verifyToken) {
      verifyToken = botMeta.verifyToken;
    }
  }

  const response: GetBotWebhookInfoResponse = {
    webhookUrl: `${apiHost}/${bot.provider}/webhook/${id}`,
    verifyToken,
  };

  return c.json(response);
});

botRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingBot = await getBot(db, id, organizationId);
  if (!existingBot) return c.json({ error: "Bot not found" }, 404);

  const deletedBot = await deleteBot(db, id, organizationId);
  if (!deletedBot) return c.json({ error: "Failed to delete bot" }, 500);

  const response: DeleteBotResponse = { id: deletedBot.id };
  return c.json(response);
});

export default botRoutes;
