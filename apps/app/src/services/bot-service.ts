import type {
  BotProvider,
  BotResponse,
  CreateBotRequest,
  DeleteBotResponse,
  GetBotResponse,
  GetBotTriggerResponse,
  GetBotWebhookInfoResponse,
  ListBotsResponse,
  UpdateBotRequest,
  UpdateBotResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/bots";
const WORKFLOWS_ENDPOINT = "/workflows";

// --- List hooks (with optional provider filter) ---

export const useBots = (
  provider?: BotProvider
): {
  bots: BotResponse[];
  botsError: Error | null;
  isBotsLoading: boolean;
  mutateBots: () => Promise<unknown>;
} => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const queryParam = provider ? `?provider=${provider}` : "";
  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}${queryParam}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListBotsResponse>(
            orgId,
            API_ENDPOINT_BASE,
            queryParam
          );
          return response.bots;
        }
      : null
  );

  return {
    bots: data || [],
    botsError: error || null,
    isBotsLoading: isLoading,
    mutateBots: mutate,
  };
};

// Provider-specific list hooks for backward compatibility

export const useDiscordBots = () => {
  const { bots, botsError, isBotsLoading, mutateBots } = useBots("discord");
  return {
    discordBots: bots,
    discordBotsError: botsError,
    isDiscordBotsLoading: isBotsLoading,
    mutateDiscordBots: mutateBots,
  };
};

export const useTelegramBots = () => {
  const { bots, botsError, isBotsLoading, mutateBots } = useBots("telegram");
  return {
    telegramBots: bots,
    telegramBotsError: botsError,
    isTelegramBotsLoading: isBotsLoading,
    mutateTelegramBots: mutateBots,
  };
};

export const useSlackBots = () => {
  const { bots, botsError, isBotsLoading, mutateBots } = useBots("slack");
  return {
    slackBots: bots,
    slackBotsError: botsError,
    isSlackBotsLoading: isBotsLoading,
    mutateSlackBots: mutateBots,
  };
};

export const useWhatsAppAccounts = () => {
  const { bots, botsError, isBotsLoading, mutateBots } = useBots("whatsapp");
  return {
    whatsappAccounts: bots,
    whatsappAccountsError: botsError,
    isWhatsAppAccountsLoading: isBotsLoading,
    mutateWhatsAppAccounts: mutateBots,
  };
};

// --- Single bot hook ---

export const useBot = (id: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetBotResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    bot: data,
    botError: error || null,
    isBotLoading: isLoading,
    mutateBot: mutate,
  };
};

// Provider-specific single bot hooks for backward compatibility

export const useDiscordBot = (id: string | null) => {
  const { bot, botError, isBotLoading, mutateBot } = useBot(id);
  return {
    discordBot: bot
      ? {
          ...bot,
          applicationId:
            (bot.metadata as Record<string, string | undefined>)
              ?.applicationId ?? "",
          publicKey:
            (bot.metadata as Record<string, string | undefined>)?.publicKey ??
            "",
        }
      : undefined,
    discordBotError: botError,
    isDiscordBotLoading: isBotLoading,
    mutateDiscordBot: mutateBot,
  };
};

export const useTelegramBot = (id: string | null) => {
  const { bot, botError, isBotLoading, mutateBot } = useBot(id);
  return {
    telegramBot: bot
      ? {
          ...bot,
          botUsername:
            (bot.metadata as Record<string, string | undefined>)?.botUsername ??
            undefined,
        }
      : undefined,
    telegramBotError: botError,
    isTelegramBotLoading: isBotLoading,
    mutateTelegramBot: mutateBot,
  };
};

export const useSlackBot = (id: string | null) => {
  const { bot, botError, isBotLoading, mutateBot } = useBot(id);
  return {
    slackBot: bot
      ? {
          ...bot,
          appId:
            (bot.metadata as Record<string, string | undefined>)?.appId ??
            undefined,
          teamId:
            (bot.metadata as Record<string, string | undefined>)?.teamId ??
            undefined,
          teamName:
            (bot.metadata as Record<string, string | undefined>)?.teamName ??
            undefined,
        }
      : undefined,
    slackBotError: botError,
    isSlackBotLoading: isBotLoading,
    mutateSlackBot: mutateBot,
  };
};

export const useWhatsAppAccount = (id: string | null) => {
  const { bot, botError, isBotLoading, mutateBot } = useBot(id);
  return {
    whatsappAccount: bot
      ? {
          ...bot,
          phoneNumberId:
            (bot.metadata as Record<string, string | undefined>)
              ?.phoneNumberId ?? "",
          wabaId:
            (bot.metadata as Record<string, string | undefined>)?.wabaId ??
            undefined,
        }
      : undefined,
    whatsappAccountError: botError,
    isWhatsAppAccountLoading: isBotLoading,
    mutateWhatsAppAccount: mutateBot,
  };
};

// --- Webhook info (WhatsApp) ---

export const useWhatsAppWebhookInfo = (id: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey =
    orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}/webhook-info` : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetBotWebhookInfoResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${id}/webhook-info`
          );
        }
      : null
  );

  return {
    webhookInfo: data,
    webhookInfoError: error || null,
    isWebhookInfoLoading: isLoading,
  };
};

// --- CRUD operations ---

export const createBot = async (
  request: CreateBotRequest,
  orgId: string
): Promise<BotResponse> => {
  return await makeOrgRequest<BotResponse>(orgId, API_ENDPOINT_BASE, "", {
    method: "POST",
    body: JSON.stringify(request),
  });
};

export const updateBot = async (
  id: string,
  request: UpdateBotRequest,
  orgId: string
): Promise<UpdateBotResponse> => {
  return await makeOrgRequest<UpdateBotResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );
};

export const deleteBot = async (
  id: string,
  orgId: string
): Promise<DeleteBotResponse> => {
  return await makeOrgRequest<DeleteBotResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};

// Provider-specific create helpers (map old field names to new CreateBotRequest)

export const createDiscordBot = async (
  request: {
    name: string;
    botToken: string;
    applicationId: string;
    publicKey: string;
  },
  orgId: string
): Promise<BotResponse> => {
  return createBot(
    {
      name: request.name,
      provider: "discord",
      token: request.botToken,
      applicationId: request.applicationId,
      publicKey: request.publicKey,
    },
    orgId
  );
};

export const createTelegramBot = async (
  request: { name: string; botToken: string },
  orgId: string
): Promise<BotResponse> => {
  return createBot(
    {
      name: request.name,
      provider: "telegram",
      token: request.botToken,
    },
    orgId
  );
};

export const createSlackBot = async (
  request: { name: string; botToken: string; signingSecret: string },
  orgId: string
): Promise<BotResponse> => {
  return createBot(
    {
      name: request.name,
      provider: "slack",
      token: request.botToken,
      signingSecret: request.signingSecret,
    },
    orgId
  );
};

export const createWhatsAppAccount = async (
  request: {
    name: string;
    accessToken: string;
    phoneNumberId: string;
    wabaId?: string;
    appSecret: string;
  },
  orgId: string
): Promise<BotResponse> => {
  return createBot(
    {
      name: request.name,
      provider: "whatsapp",
      token: request.accessToken,
      phoneNumberId: request.phoneNumberId,
      wabaId: request.wabaId,
      appSecret: request.appSecret,
    },
    orgId
  );
};

// Provider-specific update helpers

export const updateDiscordBot = async (
  id: string,
  request: { name?: string; publicKey?: string; botToken?: string },
  orgId: string
): Promise<UpdateBotResponse> => {
  return updateBot(
    id,
    {
      name: request.name,
      publicKey: request.publicKey,
      token: request.botToken,
    },
    orgId
  );
};

export const updateTelegramBot = async (
  id: string,
  request: { name?: string; botToken?: string },
  orgId: string
): Promise<UpdateBotResponse> => {
  return updateBot(
    id,
    {
      name: request.name,
      token: request.botToken,
    },
    orgId
  );
};

export const updateSlackBot = async (
  id: string,
  request: { name?: string; botToken?: string; signingSecret?: string },
  orgId: string
): Promise<UpdateBotResponse> => {
  return updateBot(
    id,
    {
      name: request.name,
      token: request.botToken,
      signingSecret: request.signingSecret,
    },
    orgId
  );
};

export const updateWhatsAppAccount = async (
  id: string,
  request: {
    name?: string;
    accessToken?: string;
    phoneNumberId?: string;
    appSecret?: string;
    wabaId?: string;
  },
  orgId: string
): Promise<UpdateBotResponse> => {
  return updateBot(
    id,
    {
      name: request.name,
      token: request.accessToken,
      phoneNumberId: request.phoneNumberId,
      appSecret: request.appSecret,
      wabaId: request.wabaId,
    },
    orgId
  );
};

// Provider-specific delete aliases

export const deleteDiscordBot = deleteBot;
export const deleteTelegramBot = deleteBot;
export const deleteSlackBot = deleteBot;
export const deleteWhatsAppAccount = deleteBot;

// --- Bot Trigger ---

export const useBotTrigger = (workflowId: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey =
    orgId && workflowId
      ? `/${orgId}${WORKFLOWS_ENDPOINT}/${workflowId}/bot-trigger`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && workflowId
      ? async () => {
          try {
            return await makeOrgRequest<GetBotTriggerResponse>(
              orgId,
              WORKFLOWS_ENDPOINT,
              `/${workflowId}/bot-trigger`
            );
          } catch (err) {
            if (err instanceof Error && err.message === "Resource not found") {
              return null;
            }
            throw err;
          }
        }
      : null
  );

  return {
    botTrigger: data ?? null,
    botTriggerError: error ?? null,
    isBotTriggerLoading: isLoading,
    mutateBotTrigger: mutate,
  };
};

// Backward-compatible trigger hooks

export const useDiscordTrigger = (workflowId: string | null) => {
  const { botTrigger, botTriggerError, isBotTriggerLoading, mutateBotTrigger } =
    useBotTrigger(workflowId);

  // Filter: only return if this is a discord trigger
  const discordTrigger =
    botTrigger && botTrigger.provider === "discord" ? botTrigger : null;

  return {
    discordTrigger,
    discordTriggerError: botTriggerError,
    isDiscordTriggerLoading: isBotTriggerLoading,
    mutateDiscordTrigger: mutateBotTrigger,
  };
};

export const syncBotTrigger = async (
  workflowId: string,
  orgId: string
): Promise<{ commandName: string; synced: boolean }> => {
  return await makeOrgRequest<{ commandName: string; synced: boolean }>(
    orgId,
    WORKFLOWS_ENDPOINT,
    `/${workflowId}/bot-trigger/sync`,
    {
      method: "POST",
    }
  );
};

// Backward-compatible alias
export const syncDiscordTrigger = syncBotTrigger;

export const deleteBotTrigger = async (
  orgId: string,
  workflowId: string
): Promise<void> => {
  await makeOrgRequest(
    orgId,
    WORKFLOWS_ENDPOINT,
    `/${workflowId}/bot-trigger`,
    { method: "DELETE" }
  );
};

// Backward-compatible aliases
export const deleteDiscordTrigger = deleteBotTrigger;
export const deleteTelegramTrigger = deleteBotTrigger;
