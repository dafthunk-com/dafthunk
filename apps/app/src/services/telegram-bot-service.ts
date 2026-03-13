import type {
  CreateTelegramBotRequest,
  CreateTelegramBotResponse,
  DeleteTelegramBotResponse,
  GetTelegramBotResponse,
  ListTelegramBotsResponse,
  UpdateTelegramBotRequest,
  UpdateTelegramBotResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/telegram-bots";

export const useTelegramBots = (): {
  telegramBots: ListTelegramBotsResponse["telegramBots"];
  telegramBotsError: Error | null;
  isTelegramBotsLoading: boolean;
  mutateTelegramBots: () => Promise<unknown>;
} => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListTelegramBotsResponse>(
            orgId,
            API_ENDPOINT_BASE,
            ""
          );
          return response.telegramBots;
        }
      : null
  );

  return {
    telegramBots: data || [],
    telegramBotsError: error || null,
    isTelegramBotsLoading: isLoading,
    mutateTelegramBots: mutate,
  };
};

export const useTelegramBot = (id: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetTelegramBotResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    telegramBot: data,
    telegramBotError: error || null,
    isTelegramBotLoading: isLoading,
    mutateTelegramBot: mutate,
  };
};

export const createTelegramBot = async (
  request: CreateTelegramBotRequest,
  orgId: string
): Promise<CreateTelegramBotResponse> => {
  return await makeOrgRequest<CreateTelegramBotResponse>(
    orgId,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );
};

export const updateTelegramBot = async (
  id: string,
  request: UpdateTelegramBotRequest,
  orgId: string
): Promise<UpdateTelegramBotResponse> => {
  return await makeOrgRequest<UpdateTelegramBotResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );
};

export const deleteTelegramBot = async (
  id: string,
  orgId: string
): Promise<DeleteTelegramBotResponse> => {
  return await makeOrgRequest<DeleteTelegramBotResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
