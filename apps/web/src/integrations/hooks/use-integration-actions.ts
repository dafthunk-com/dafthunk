import type {
  CreateIntegrationRequest,
  CreateIntegrationResponse,
  DeleteIntegrationResponse,
  IntegrationProvider,
  UpdateIntegrationResponse,
} from "@dafthunk/types";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { getApiBaseUrl } from "@/config/api";
import { makeOrgRequest } from "@/services/utils";

import { getProvider, getProviderLabel } from "../providers";
import { useIntegrations } from "./use-integrations";

const API_ENDPOINT = "/integrations";

interface IntegrationActionsResult {
  isProcessing: boolean;
  connectOAuth: (provider: IntegrationProvider) => void;
  createManual: (
    provider: IntegrationProvider,
    name: string,
    apiKey: string
  ) => Promise<void>;
  deleteIntegration: (integrationId: string) => Promise<void>;
  updateIntegration: (
    integrationId: string,
    updates: {
      name?: string;
      token?: string;
      refreshToken?: string;
      tokenExpiresAt?: Date;
      metadata?: string;
    }
  ) => Promise<void>;
}

/**
 * Hook for performing integration actions (create, update, delete, OAuth)
 */
export function useIntegrationActions(): IntegrationActionsResult {
  const { organization } = useAuth();
  const { mutate } = useIntegrations();
  const [isProcessing, setIsProcessing] = useState(false);

  const connectOAuth = useCallback((provider: IntegrationProvider) => {
    const providerConfig = getProvider(provider);
    if (!providerConfig?.oauthEndpoint) {
      toast.error("OAuth not supported for this provider");
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    window.location.href = `${apiBaseUrl}${providerConfig.oauthEndpoint}`;
  }, []);

  const createManual = useCallback(
    async (
      provider: IntegrationProvider,
      name: string,
      apiKey: string
    ): Promise<void> => {
      if (!organization?.handle || !name || !apiKey) {
        return;
      }

      setIsProcessing(true);
      try {
        const providerLabel = getProviderLabel(provider);
        const integrationName = `${providerLabel} - ${name}`;

        const request: CreateIntegrationRequest = {
          name: integrationName,
          provider,
          token: apiKey,
        };

        await makeOrgRequest<CreateIntegrationResponse>(
          organization.handle,
          API_ENDPOINT,
          "",
          {
            method: "POST",
            body: JSON.stringify(request),
          }
        );

        toast.success("Integration created successfully");
        await mutate();
      } catch (error) {
        toast.error("Failed to create integration. Please try again.");
        console.error("Create Integration Error:", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [organization?.handle, mutate]
  );

  const deleteIntegration = useCallback(
    async (integrationId: string): Promise<void> => {
      if (!organization?.handle) return;

      setIsProcessing(true);
      try {
        await makeOrgRequest<DeleteIntegrationResponse>(
          organization.handle,
          API_ENDPOINT,
          `/${integrationId}`,
          {
            method: "DELETE",
          }
        );

        toast.success("Integration deleted successfully");
        await mutate();
      } catch (error) {
        toast.error("Failed to delete integration. Please try again.");
        console.error("Delete Integration Error:", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [organization?.handle, mutate]
  );

  const updateIntegration = useCallback(
    async (
      integrationId: string,
      updates: {
        name?: string;
        token?: string;
        refreshToken?: string;
        tokenExpiresAt?: Date;
        metadata?: string;
      }
    ): Promise<void> => {
      if (!organization?.handle) return;

      setIsProcessing(true);
      try {
        await makeOrgRequest<UpdateIntegrationResponse>(
          organization.handle,
          API_ENDPOINT,
          `/${integrationId}`,
          {
            method: "PUT",
            body: JSON.stringify(updates),
          }
        );

        toast.success("Integration updated successfully");
        await mutate();
      } catch (error) {
        toast.error("Failed to update integration. Please try again.");
        console.error("Update Integration Error:", error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [organization?.handle, mutate]
  );

  return {
    isProcessing,
    connectOAuth,
    createManual,
    deleteIntegration,
    updateIntegration,
  };
}
