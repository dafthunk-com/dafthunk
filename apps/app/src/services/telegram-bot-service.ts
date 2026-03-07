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
  const orgHandle = organization?.handle;

  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListTelegramBotsResponse>(
            orgHandle,
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
  const orgHandle = organization?.handle;

  const swrKey =
    orgHandle && id ? `/${orgHandle}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle && id
      ? async () => {
          return await makeOrgRequest<GetTelegramBotResponse>(
            orgHandle,
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
  orgHandle: string
): Promise<CreateTelegramBotResponse> => {
  return await makeOrgRequest<CreateTelegramBotResponse>(
    orgHandle,
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
  orgHandle: string
): Promise<UpdateTelegramBotResponse> => {
  return await makeOrgRequest<UpdateTelegramBotResponse>(
    orgHandle,
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
  orgHandle: string
): Promise<DeleteTelegramBotResponse> => {
  return await makeOrgRequest<DeleteTelegramBotResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
