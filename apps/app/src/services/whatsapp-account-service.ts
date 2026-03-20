import type {
  CreateWhatsAppAccountRequest,
  CreateWhatsAppAccountResponse,
  DeleteWhatsAppAccountResponse,
  GetWhatsAppAccountResponse,
  ListWhatsAppAccountsResponse,
  UpdateWhatsAppAccountRequest,
  UpdateWhatsAppAccountResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/whatsapp-accounts";

export const useWhatsAppAccounts = (): {
  whatsappAccounts: ListWhatsAppAccountsResponse["whatsappAccounts"];
  whatsappAccountsError: Error | null;
  isWhatsAppAccountsLoading: boolean;
  mutateWhatsAppAccounts: () => Promise<unknown>;
} => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListWhatsAppAccountsResponse>(
            orgId,
            API_ENDPOINT_BASE,
            ""
          );
          return response.whatsappAccounts;
        }
      : null
  );

  return {
    whatsappAccounts: data || [],
    whatsappAccountsError: error || null,
    isWhatsAppAccountsLoading: isLoading,
    mutateWhatsAppAccounts: mutate,
  };
};

export const useWhatsAppAccount = (id: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetWhatsAppAccountResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    whatsappAccount: data,
    whatsappAccountError: error || null,
    isWhatsAppAccountLoading: isLoading,
    mutateWhatsAppAccount: mutate,
  };
};

export const createWhatsAppAccount = async (
  request: CreateWhatsAppAccountRequest,
  orgId: string
): Promise<CreateWhatsAppAccountResponse> => {
  return await makeOrgRequest<CreateWhatsAppAccountResponse>(
    orgId,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );
};

export const updateWhatsAppAccount = async (
  id: string,
  request: UpdateWhatsAppAccountRequest,
  orgId: string
): Promise<UpdateWhatsAppAccountResponse> => {
  return await makeOrgRequest<UpdateWhatsAppAccountResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );
};

export const deleteWhatsAppAccount = async (
  id: string,
  orgId: string
): Promise<DeleteWhatsAppAccountResponse> => {
  return await makeOrgRequest<DeleteWhatsAppAccountResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
