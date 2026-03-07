import type {
  CreateDiscordBotRequest,
  CreateDiscordBotResponse,
  DeleteDiscordBotResponse,
  GetDiscordBotResponse,
  ListDiscordBotsResponse,
  UpdateDiscordBotRequest,
  UpdateDiscordBotResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import {
  createDatabase,
  createDiscordBot,
  createHandle,
  deleteDiscordBot,
  getDiscordBot,
  getDiscordBots,
  updateDiscordBot,
} from "../db";
import { encryptSecret } from "../utils/encryption";

type ExtendedApiContext = ApiContext & {
  Variables: {
    organizationId?: string;
  };
};

const discordBotRoutes = new Hono<ExtendedApiContext>();

discordBotRoutes.use("*", jwtMiddleware);

discordBotRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allBots = await getDiscordBots(db, organizationId);

  const response: ListDiscordBotsResponse = { discordBots: allBots };
  return c.json(response);
});

discordBotRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Bot name is required"),
      botToken: z.string().min(1, "Bot token is required"),
      applicationId: z.string().min(1, "Application ID is required"),
    }) as z.ZodType<CreateDiscordBotRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    // Validate the bot token by calling Discord API
    const discordResponse = await fetch(
      "https://discord.com/api/v10/users/@me",
      { headers: { Authorization: `Bot ${data.botToken}` } }
    );

    if (!discordResponse.ok) {
      return c.json(
        { error: "Invalid bot token. Please check your Discord bot token." },
        400
      );
    }

    const now = new Date();
    const botId = uuid();
    const botName = data.name || "Untitled Bot";
    const botHandle = createHandle(botName);
    const tokenLastFour = data.botToken.slice(-4);

    const encryptedBotToken = await encryptSecret(
      data.botToken,
      c.env,
      organizationId
    );

    const newBot = await createDiscordBot(db, {
      id: botId,
      name: botName,
      handle: botHandle,
      encryptedBotToken,
      applicationId: data.applicationId,
      tokenLastFour,
      organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateDiscordBotResponse = {
      id: newBot.id,
      name: newBot.name,
      handle: newBot.handle,
      applicationId: newBot.applicationId,
      tokenLastFour: newBot.tokenLastFour,
      createdAt: newBot.createdAt,
      updatedAt: newBot.updatedAt,
    };

    return c.json(response, 201);
  }
);

discordBotRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const bot = await getDiscordBot(db, id, organizationId);
  if (!bot) {
    return c.json({ error: "Discord bot not found" }, 404);
  }

  const response: GetDiscordBotResponse = {
    id: bot.id,
    name: bot.name,
    handle: bot.handle,
    applicationId: bot.applicationId,
    tokenLastFour: bot.tokenLastFour,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  };

  return c.json(response);
});

discordBotRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      botToken: z.string().min(1).optional(),
    }) as z.ZodType<UpdateDiscordBotRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingBot = await getDiscordBot(db, id, organizationId);
    if (!existingBot) {
      return c.json({ error: "Discord bot not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.botToken) {
      // Validate new token
      const discordResponse = await fetch(
        "https://discord.com/api/v10/users/@me",
        { headers: { Authorization: `Bot ${data.botToken}` } }
      );

      if (!discordResponse.ok) {
        return c.json(
          {
            error: "Invalid bot token. Please check your Discord bot token.",
          },
          400
        );
      }

      updateData.encryptedBotToken = await encryptSecret(
        data.botToken,
        c.env,
        organizationId
      );
      updateData.tokenLastFour = data.botToken.slice(-4);
    }

    const updatedBot = await updateDiscordBot(
      db,
      id,
      organizationId,
      updateData as Partial<typeof existingBot>
    );

    const response: UpdateDiscordBotResponse = {
      id: updatedBot.id,
      name: updatedBot.name,
      handle: updatedBot.handle,
      applicationId: updatedBot.applicationId,
      tokenLastFour: updatedBot.tokenLastFour,
      createdAt: updatedBot.createdAt,
      updatedAt: updatedBot.updatedAt,
    };

    return c.json(response);
  }
);

discordBotRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingBot = await getDiscordBot(db, id, organizationId);
  if (!existingBot) {
    return c.json({ error: "Discord bot not found" }, 404);
  }

  const deletedBot = await deleteDiscordBot(db, id, organizationId);
  if (!deletedBot) {
    return c.json({ error: "Failed to delete Discord bot" }, 500);
  }

  const response: DeleteDiscordBotResponse = { id: deletedBot.id };
  return c.json(response);
});

export default discordBotRoutes;
