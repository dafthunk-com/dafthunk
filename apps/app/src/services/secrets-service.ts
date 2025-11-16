import {
  CreateSecretResponse,
  DeleteSecretResponse,
  ListSecretsResponse,
  Secret,
  UpdateSecretResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for secrets
const API_ENDPOINT_BASE = "/secrets";

interface UseSecrets {
  secrets: Secret[];
  secretsError: Error | null;
  isSecretsLoading: boolean;
  mutateSecrets: () => Promise<any>;
}

/**
 * Hook to list all secrets for the current organization
 */
export const useSecrets = (): UseSecrets => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListSecretsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.secrets;
        }
      : null
  );

  return {
    secrets: data || [],
    secretsError: error || null,
    isSecretsLoading: isLoading,
    mutateSecrets: mutate,
  };
};

/**
 * Create a new secret for the current organization
 */
export const createSecret = async (
  name: string,
  value: string,
  orgHandle: string
): Promise<Secret> => {
  const response = await makeOrgRequest<CreateSecretResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify({ name, value }),
    }
  );

  // We only return the metadata, not the value since user just entered it
  return {
    id: response.secret.id,
    name: response.secret.name,
    createdAt: response.secret.createdAt,
    updatedAt: response.secret.updatedAt,
  };
};

// Note: We intentionally don't provide a function to get secret values
// after creation for security reasons. Values can only be seen once during creation.

/**
 * Update a secret
 */
export const updateSecret = async (
  id: string,
  updates: { name?: string; value?: string },
  orgHandle: string
): Promise<Secret> => {
  const response = await makeOrgRequest<UpdateSecretResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    }
  );

  return response.secret;
};

/**
 * Delete a secret from the current organization
 */
export const deleteSecret = async (
  id: string,
  orgHandle: string
): Promise<boolean> => {
  const response = await makeOrgRequest<DeleteSecretResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );

  return response.success;
};
