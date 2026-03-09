import type {
  CreateDiscordBotRequest,
  CreateDiscordBotResponse,
  DeleteDiscordBotResponse,
  GetDiscordBotResponse,
  GetDiscordTriggerResponse,
  ListDiscordBotsResponse,
  SyncDiscordTriggerResponse,
  UpdateDiscordBotRequest,
  UpdateDiscordBotResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/discord-bots";

export const useDiscordBots = (): {
  discordBots: ListDiscordBotsResponse["discordBots"];
  discordBotsError: Error | null;
  isDiscordBotsLoading: boolean;
  mutateDiscordBots: () => Promise<unknown>;
} => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListDiscordBotsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.discordBots;
        }
      : null
  );

  return {
    discordBots: data || [],
    discordBotsError: error || null,
    isDiscordBotsLoading: isLoading,
    mutateDiscordBots: mutate,
  };
};

export const useDiscordBot = (id: string | null) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey =
    orgHandle && id ? `/${orgHandle}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle && id
      ? async () => {
          return await makeOrgRequest<GetDiscordBotResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    discordBot: data,
    discordBotError: error || null,
    isDiscordBotLoading: isLoading,
    mutateDiscordBot: mutate,
  };
};

export const createDiscordBot = async (
  request: CreateDiscordBotRequest,
  orgHandle: string
): Promise<CreateDiscordBotResponse> => {
  return await makeOrgRequest<CreateDiscordBotResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );
};

export const updateDiscordBot = async (
  id: string,
  request: UpdateDiscordBotRequest,
  orgHandle: string
): Promise<UpdateDiscordBotResponse> => {
  return await makeOrgRequest<UpdateDiscordBotResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );
};

export const deleteDiscordBot = async (
  id: string,
  orgHandle: string
): Promise<DeleteDiscordBotResponse> => {
  return await makeOrgRequest<DeleteDiscordBotResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};

const WORKFLOWS_ENDPOINT = "/workflows";

export const useDiscordTrigger = (workflowIdOrHandle: string | null) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey =
    orgHandle && workflowIdOrHandle
      ? `/${orgHandle}${WORKFLOWS_ENDPOINT}/${workflowIdOrHandle}/discord-trigger`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle && workflowIdOrHandle
      ? async () => {
          return await makeOrgRequest<GetDiscordTriggerResponse>(
            orgHandle,
            WORKFLOWS_ENDPOINT,
            `/${workflowIdOrHandle}/discord-trigger`
          );
        }
      : null
  );

  return {
    discordTrigger: data ?? null,
    discordTriggerError: error ?? null,
    isDiscordTriggerLoading: isLoading,
    mutateDiscordTrigger: mutate,
  };
};

export const syncDiscordTrigger = async (
  workflowIdOrHandle: string,
  orgHandle: string
): Promise<SyncDiscordTriggerResponse> => {
  return await makeOrgRequest<SyncDiscordTriggerResponse>(
    orgHandle,
    WORKFLOWS_ENDPOINT,
    `/${workflowIdOrHandle}/discord-trigger/sync`,
    {
      method: "POST",
    }
  );
};
