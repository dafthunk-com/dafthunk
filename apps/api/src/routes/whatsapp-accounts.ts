import type {
  CreateWhatsAppAccountRequest,
  CreateWhatsAppAccountResponse,
  DeleteWhatsAppAccountResponse,
  GetWhatsAppAccountResponse,
  ListWhatsAppAccountsResponse,
  UpdateWhatsAppAccountRequest,
  UpdateWhatsAppAccountResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import {
  createDatabase,
  createWhatsAppAccount,
  deleteWhatsAppAccount,
  getWhatsAppAccount,
  getWhatsAppAccounts,
  updateWhatsAppAccount,
} from "../db";
import { encryptSecret } from "../utils/encryption";

const whatsappAccountRoutes = new Hono<ApiContext>();

whatsappAccountRoutes.use("*", jwtMiddleware);

whatsappAccountRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allAccounts = await getWhatsAppAccounts(db, organizationId);

  const response: ListWhatsAppAccountsResponse = {
    whatsappAccounts: allAccounts,
  };
  return c.json(response);
});

whatsappAccountRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Account name is required"),
      accessToken: z.string().min(1, "Access token is required"),
      phoneNumberId: z.string().min(1, "Phone number ID is required"),
      wabaId: z.string().optional(),
      appSecret: z.string().optional(),
    }) as z.ZodType<CreateWhatsAppAccountRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    // Validate the access token by calling WhatsApp Business API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v21.0/${data.phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      }
    );

    if (!whatsappResponse.ok) {
      return c.json(
        {
          error:
            "Invalid access token or phone number ID. Please check your WhatsApp Business API credentials.",
        },
        400
      );
    }

    const now = new Date();
    const accountId = uuid();
    const accountName = data.name || "Untitled Account";
    const tokenLastFour = data.accessToken.slice(-4);

    const encryptedAccessToken = await encryptSecret(
      data.accessToken,
      c.env,
      organizationId
    );

    let encryptedAppSecret: string | null = null;
    if (data.appSecret) {
      encryptedAppSecret = await encryptSecret(
        data.appSecret,
        c.env,
        organizationId
      );
    }

    const newAccount = await createWhatsAppAccount(db, {
      id: accountId,
      name: accountName,
      phoneNumberId: data.phoneNumberId,
      encryptedAccessToken,
      tokenLastFour,
      wabaId: data.wabaId ?? null,
      encryptedAppSecret,
      organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateWhatsAppAccountResponse = {
      id: newAccount.id,
      name: newAccount.name,
      phoneNumberId: newAccount.phoneNumberId,
      wabaId: newAccount.wabaId,
      tokenLastFour: newAccount.tokenLastFour,
      createdAt: newAccount.createdAt,
      updatedAt: newAccount.updatedAt,
    };

    return c.json(response, 201);
  }
);

whatsappAccountRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const account = await getWhatsAppAccount(db, id, organizationId);
  if (!account) {
    return c.json({ error: "WhatsApp account not found" }, 404);
  }

  const response: GetWhatsAppAccountResponse = {
    id: account.id,
    name: account.name,
    phoneNumberId: account.phoneNumberId,
    wabaId: account.wabaId,
    tokenLastFour: account.tokenLastFour,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };

  return c.json(response);
});

whatsappAccountRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      accessToken: z.string().min(1).optional(),
      phoneNumberId: z.string().min(1).optional(),
      wabaId: z.string().optional(),
      appSecret: z.string().optional(),
    }) as z.ZodType<UpdateWhatsAppAccountRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingAccount = await getWhatsAppAccount(db, id, organizationId);
    if (!existingAccount) {
      return c.json({ error: "WhatsApp account not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.phoneNumberId) {
      updateData.phoneNumberId = data.phoneNumberId;
    }

    if (data.wabaId !== undefined) {
      updateData.wabaId = data.wabaId;
    }

    if (data.accessToken) {
      // Validate new token
      const phoneNumberId = data.phoneNumberId ?? existingAccount.phoneNumberId;
      const whatsappResponse = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        }
      );

      if (!whatsappResponse.ok) {
        return c.json(
          {
            error:
              "Invalid access token. Please check your WhatsApp Business API credentials.",
          },
          400
        );
      }

      updateData.encryptedAccessToken = await encryptSecret(
        data.accessToken,
        c.env,
        organizationId
      );
      updateData.tokenLastFour = data.accessToken.slice(-4);
    }

    if (data.appSecret) {
      updateData.encryptedAppSecret = await encryptSecret(
        data.appSecret,
        c.env,
        organizationId
      );
    }

    const updatedAccount = await updateWhatsAppAccount(
      db,
      id,
      organizationId,
      updateData as Partial<typeof existingAccount>
    );

    const response: UpdateWhatsAppAccountResponse = {
      id: updatedAccount.id,
      name: updatedAccount.name,
      phoneNumberId: updatedAccount.phoneNumberId,
      wabaId: updatedAccount.wabaId,
      tokenLastFour: updatedAccount.tokenLastFour,
      createdAt: updatedAccount.createdAt,
      updatedAt: updatedAccount.updatedAt,
    };

    return c.json(response);
  }
);

whatsappAccountRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingAccount = await getWhatsAppAccount(db, id, organizationId);
  if (!existingAccount) {
    return c.json({ error: "WhatsApp account not found" }, 404);
  }

  const deletedAccount = await deleteWhatsAppAccount(db, id, organizationId);
  if (!deletedAccount) {
    return c.json({ error: "Failed to delete WhatsApp account" }, 500);
  }

  const response: DeleteWhatsAppAccountResponse = { id: deletedAccount.id };
  return c.json(response);
});

export default whatsappAccountRoutes;
