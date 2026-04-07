import type {
  CreateSlackBotRequest,
  CreateSlackBotResponse,
  DeleteSlackBotResponse,
  GetSlackBotResponse,
  ListSlackBotsResponse,
  UpdateSlackBotRequest,
  UpdateSlackBotResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import {
  createDatabase,
  createSlackBot,
  deleteSlackBot,
  getSlackBot,
  getSlackBots,
  updateSlackBot,
} from "../db";
import { encryptSecret } from "../utils/encryption";

const slackBotRoutes = new Hono<ApiContext>();

slackBotRoutes.use("*", jwtMiddleware);

slackBotRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allBots = await getSlackBots(db, organizationId);

  const response: ListSlackBotsResponse = {
    slackBots: allBots.map((bot) => ({
      ...bot,
      appId: bot.appId ?? "",
      teamId: bot.teamId ?? "",
      teamName: bot.teamName ?? "",
    })),
  };
  return c.json(response);
});

slackBotRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Bot name is required"),
      botToken: z.string().min(1, "Bot token is required"),
      signingSecret: z.string().min(1, "Signing secret is required"),
    }) as z.ZodType<CreateSlackBotRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    // Validate the bot token by calling Slack API
    const slackResponse = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.botToken}` },
    });

    if (!slackResponse.ok) {
      return c.json(
        { error: "Failed to validate bot token with Slack API." },
        400
      );
    }

    const slackData = (await slackResponse.json()) as {
      ok: boolean;
      error?: string;
      team_id?: string;
      team?: string;
      app_id?: string;
    };

    if (!slackData.ok) {
      return c.json(
        {
          error: `Invalid bot token: ${slackData.error ?? "unknown error"}`,
        },
        400
      );
    }

    const now = new Date();
    const botId = uuid();
    const botName = data.name || "Untitled Bot";
    const tokenLastFour = data.botToken.slice(-4);

    const encryptedBotToken = await encryptSecret(
      data.botToken,
      c.env,
      organizationId
    );

    const encryptedSigningSecret = await encryptSecret(
      data.signingSecret,
      c.env,
      organizationId
    );

    const newBot = await createSlackBot(db, {
      id: botId,
      name: botName,
      encryptedBotToken,
      encryptedSigningSecret,
      appId: slackData.app_id ?? null,
      teamId: slackData.team_id ?? null,
      teamName: slackData.team ?? null,
      tokenLastFour,
      organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateSlackBotResponse = {
      id: newBot.id,
      name: newBot.name,
      appId: newBot.appId ?? "",
      teamId: newBot.teamId ?? "",
      teamName: newBot.teamName ?? "",
      tokenLastFour: newBot.tokenLastFour,
      createdAt: newBot.createdAt,
      updatedAt: newBot.updatedAt,
    };

    return c.json(response, 201);
  }
);

slackBotRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const bot = await getSlackBot(db, id, organizationId);
  if (!bot) {
    return c.json({ error: "Slack bot not found" }, 404);
  }

  const response: GetSlackBotResponse = {
    id: bot.id,
    name: bot.name,
    appId: bot.appId ?? "",
    teamId: bot.teamId ?? "",
    teamName: bot.teamName ?? "",
    tokenLastFour: bot.tokenLastFour,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  };

  return c.json(response);
});

slackBotRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      botToken: z.string().min(1).optional(),
      signingSecret: z.string().min(1).optional(),
    }) as z.ZodType<UpdateSlackBotRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingBot = await getSlackBot(db, id, organizationId);
    if (!existingBot) {
      return c.json({ error: "Slack bot not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.signingSecret) {
      updateData.encryptedSigningSecret = await encryptSecret(
        data.signingSecret,
        c.env,
        organizationId
      );
    }

    if (data.botToken) {
      // Validate new token
      const slackResponse = await fetch("https://slack.com/api/auth.test", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.botToken}` },
      });

      const slackData = (await slackResponse.json()) as {
        ok: boolean;
        error?: string;
        team_id?: string;
        team?: string;
        app_id?: string;
      };

      if (!slackResponse.ok || !slackData.ok) {
        return c.json(
          {
            error: `Invalid bot token: ${slackData.error ?? "unknown error"}`,
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
      updateData.appId = slackData.app_id ?? existingBot.appId;
      updateData.teamId = slackData.team_id ?? existingBot.teamId;
      updateData.teamName = slackData.team ?? existingBot.teamName;
    }

    const updatedBot = await updateSlackBot(
      db,
      id,
      organizationId,
      updateData as Partial<typeof existingBot>
    );

    const response: UpdateSlackBotResponse = {
      id: updatedBot.id,
      name: updatedBot.name,
      appId: updatedBot.appId ?? "",
      teamId: updatedBot.teamId ?? "",
      teamName: updatedBot.teamName ?? "",
      tokenLastFour: updatedBot.tokenLastFour,
      createdAt: updatedBot.createdAt,
      updatedAt: updatedBot.updatedAt,
    };

    return c.json(response);
  }
);

slackBotRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingBot = await getSlackBot(db, id, organizationId);
  if (!existingBot) {
    return c.json({ error: "Slack bot not found" }, 404);
  }

  const deletedBot = await deleteSlackBot(db, id, organizationId);
  if (!deletedBot) {
    return c.json({ error: "Failed to delete Slack bot" }, 500);
  }

  const response: DeleteSlackBotResponse = { id: deletedBot.id };
  return c.json(response);
});

export default slackBotRoutes;
