import {
  ApiKey,
  ApiKeyWithSecret,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
  ListApiKeysResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for API keys
const API_ENDPOINT_BASE = "/api-keys";

interface UseApiKeys {
  apiKeys: ApiKey[];
  apiKeysError: Error | null;
  isApiKeysLoading: boolean;
  mutateApiKeys: () => Promise<any>;
}

/**
 * Hook to list all API keys for the current organization
 */
export const useApiKeys = (): UseApiKeys => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListApiKeysResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.apiKeys;
        }
      : null
  );

  return {
    apiKeys: data || [],
    apiKeysError: error || null,
    isApiKeysLoading: isLoading,
    mutateApiKeys: mutate,
  };
};

/**
 * Create a new API key for the current organization
 */
export const createApiKey = async (
  name: string,
  orgHandle: string
): Promise<ApiKeyWithSecret> => {
  const response = await makeOrgRequest<CreateApiKeyResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    }
  );

  return response.apiKey;
};

/**
 * Delete an API key from the current organization
 */
export const deleteApiKey = async (
  id: string,
  orgHandle: string
): Promise<boolean> => {
  const response = await makeOrgRequest<DeleteApiKeyResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );

  return response.success;
};
