import type {
  CreateSlackBotRequest,
  CreateSlackBotResponse,
  DeleteSlackBotResponse,
  GetSlackBotResponse,
  ListSlackBotsResponse,
  UpdateSlackBotRequest,
  UpdateSlackBotResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/slack-bots";

export const useSlackBots = (): {
  slackBots: ListSlackBotsResponse["slackBots"];
  slackBotsError: Error | null;
  isSlackBotsLoading: boolean;
  mutateSlackBots: () => Promise<unknown>;
} => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListSlackBotsResponse>(
            orgId,
            API_ENDPOINT_BASE,
            ""
          );
          return response.slackBots;
        }
      : null
  );

  return {
    slackBots: data || [],
    slackBotsError: error || null,
    isSlackBotsLoading: isLoading,
    mutateSlackBots: mutate,
  };
};

export const useSlackBot = (id: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetSlackBotResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    slackBot: data,
    slackBotError: error || null,
    isSlackBotLoading: isLoading,
    mutateSlackBot: mutate,
  };
};

export const createSlackBot = async (
  request: CreateSlackBotRequest,
  orgId: string
): Promise<CreateSlackBotResponse> => {
  return await makeOrgRequest<CreateSlackBotResponse>(
    orgId,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );
};

export const updateSlackBot = async (
  id: string,
  request: UpdateSlackBotRequest,
  orgId: string
): Promise<UpdateSlackBotResponse> => {
  return await makeOrgRequest<UpdateSlackBotResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );
};

export const deleteSlackBot = async (
  id: string,
  orgId: string
): Promise<DeleteSlackBotResponse> => {
  return await makeOrgRequest<DeleteSlackBotResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
