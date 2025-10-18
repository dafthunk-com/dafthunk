import {
  CreateIntegrationRequest,
  CreateIntegrationResponse,
  DeleteIntegrationResponse,
  Integration,
  ListIntegrationsResponse,
  UpdateIntegrationResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for integrations
const API_ENDPOINT_BASE = "/integrations";

interface UseIntegrations {
  integrations: Integration[];
  integrationsError: Error | null;
  isIntegrationsLoading: boolean;
  mutateIntegrations: () => Promise<any>;
}

/**
 * Hook to list all integrations for the current organization
 */
export const useIntegrations = (): UseIntegrations => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListIntegrationsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.integrations;
        }
      : null
  );

  return {
    integrations: data || [],
    integrationsError: error || null,
    isIntegrationsLoading: isLoading,
    mutateIntegrations: mutate,
  };
};

/**
 * Create a new integration for the current organization
 */
export const createIntegration = async (
  request: CreateIntegrationRequest,
  orgHandle: string
): Promise<Integration> => {
  const response = await makeOrgRequest<CreateIntegrationResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );

  // Return only the metadata, not the tokens since user just entered them
  return {
    id: response.integration.id,
    name: response.integration.name,
    provider: response.integration.provider,
    status: response.integration.status,
    tokenExpiresAt: response.integration.tokenExpiresAt,
    metadata: response.integration.metadata,
    createdAt: response.integration.createdAt,
    updatedAt: response.integration.updatedAt,
  };
};

/**
 * Update an integration
 */
export const updateIntegration = async (
  id: string,
  updates: {
    name?: string;
    token?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    metadata?: string;
  },
  orgHandle: string
): Promise<Integration> => {
  const response = await makeOrgRequest<UpdateIntegrationResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    }
  );

  return response.integration;
};

/**
 * Delete an integration from the current organization
 */
export const deleteIntegration = async (
  id: string,
  orgHandle: string
): Promise<boolean> => {
  const response = await makeOrgRequest<DeleteIntegrationResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );

  return response.success;
};
