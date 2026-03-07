import type {
  CreateTelegramBotRequest,
  CreateTelegramBotResponse,
  DeleteTelegramBotResponse,
  GetTelegramBotResponse,
  ListTelegramBotsResponse,
  UpdateTelegramBotRequest,
  UpdateTelegramBotResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import {
  createDatabase,
  createHandle,
  createTelegramBot,
  deleteTelegramBot,
  getTelegramBot,
  getTelegramBots,
  updateTelegramBot,
} from "../db";
import { encryptSecret } from "../utils/encryption";

type ExtendedApiContext = ApiContext & {
  Variables: {
    organizationId?: string;
  };
};

const telegramBotRoutes = new Hono<ExtendedApiContext>();

telegramBotRoutes.use("*", jwtMiddleware);

telegramBotRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allBots = await getTelegramBots(db, organizationId);

  const response: ListTelegramBotsResponse = { telegramBots: allBots };
  return c.json(response);
});

telegramBotRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Bot name is required"),
      botToken: z.string().min(1, "Bot token is required"),
    }) as z.ZodType<CreateTelegramBotRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    // Validate the bot token by calling Telegram API
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${data.botToken}/getMe`
    );

    if (!telegramResponse.ok) {
      return c.json(
        { error: "Invalid bot token. Please check your Telegram bot token." },
        400
      );
    }

    const telegramData = (await telegramResponse.json()) as {
      ok: boolean;
      result?: { username?: string };
    };
    const botUsername = telegramData.result?.username ?? null;

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

    const newBot = await createTelegramBot(db, {
      id: botId,
      name: botName,
      handle: botHandle,
      encryptedBotToken,
      botUsername,
      tokenLastFour,
      organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateTelegramBotResponse = {
      id: newBot.id,
      name: newBot.name,
      handle: newBot.handle,
      botUsername: newBot.botUsername,
      tokenLastFour: newBot.tokenLastFour,
      createdAt: newBot.createdAt,
      updatedAt: newBot.updatedAt,
    };

    return c.json(response, 201);
  }
);

telegramBotRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const bot = await getTelegramBot(db, id, organizationId);
  if (!bot) {
    return c.json({ error: "Telegram bot not found" }, 404);
  }

  const response: GetTelegramBotResponse = {
    id: bot.id,
    name: bot.name,
    handle: bot.handle,
    botUsername: bot.botUsername,
    tokenLastFour: bot.tokenLastFour,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  };

  return c.json(response);
});

telegramBotRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      botToken: z.string().min(1).optional(),
    }) as z.ZodType<UpdateTelegramBotRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingBot = await getTelegramBot(db, id, organizationId);
    if (!existingBot) {
      return c.json({ error: "Telegram bot not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.botToken) {
      // Validate new token
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${data.botToken}/getMe`
      );

      if (!telegramResponse.ok) {
        return c.json(
          {
            error: "Invalid bot token. Please check your Telegram bot token.",
          },
          400
        );
      }

      const telegramData = (await telegramResponse.json()) as {
        ok: boolean;
        result?: { username?: string };
      };

      updateData.encryptedBotToken = await encryptSecret(
        data.botToken,
        c.env,
        organizationId
      );
      updateData.tokenLastFour = data.botToken.slice(-4);
      updateData.botUsername = telegramData.result?.username ?? null;
    }

    const updatedBot = await updateTelegramBot(
      db,
      id,
      organizationId,
      updateData as Partial<typeof existingBot>
    );

    const response: UpdateTelegramBotResponse = {
      id: updatedBot.id,
      name: updatedBot.name,
      handle: updatedBot.handle,
      botUsername: updatedBot.botUsername,
      tokenLastFour: updatedBot.tokenLastFour,
      createdAt: updatedBot.createdAt,
      updatedAt: updatedBot.updatedAt,
    };

    return c.json(response);
  }
);

telegramBotRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingBot = await getTelegramBot(db, id, organizationId);
  if (!existingBot) {
    return c.json({ error: "Telegram bot not found" }, 404);
  }

  const deletedBot = await deleteTelegramBot(db, id, organizationId);
  if (!deletedBot) {
    return c.json({ error: "Failed to delete Telegram bot" }, 500);
  }

  const response: DeleteTelegramBotResponse = { id: deletedBot.id };
  return c.json(response);
});

export default telegramBotRoutes;
