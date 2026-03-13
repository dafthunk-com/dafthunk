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
  const orgId = organization?.id;

  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListDiscordBotsResponse>(
            orgId,
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
  const orgId = organization?.id;

  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetDiscordBotResponse>(
            orgId,
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
  orgId: string
): Promise<CreateDiscordBotResponse> => {
  return await makeOrgRequest<CreateDiscordBotResponse>(
    orgId,
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
  orgId: string
): Promise<UpdateDiscordBotResponse> => {
  return await makeOrgRequest<UpdateDiscordBotResponse>(
    orgId,
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
  orgId: string
): Promise<DeleteDiscordBotResponse> => {
  return await makeOrgRequest<DeleteDiscordBotResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};

const WORKFLOWS_ENDPOINT = "/workflows";

export const useDiscordTrigger = (workflowId: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey =
    orgId && workflowId
      ? `/${orgId}${WORKFLOWS_ENDPOINT}/${workflowId}/discord-trigger`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && workflowId
      ? async () => {
          return await makeOrgRequest<GetDiscordTriggerResponse>(
            orgId,
            WORKFLOWS_ENDPOINT,
            `/${workflowId}/discord-trigger`
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
  workflowId: string,
  orgId: string
): Promise<SyncDiscordTriggerResponse> => {
  return await makeOrgRequest<SyncDiscordTriggerResponse>(
    orgId,
    WORKFLOWS_ENDPOINT,
    `/${workflowId}/discord-trigger/sync`,
    {
      method: "POST",
    }
  );
};
