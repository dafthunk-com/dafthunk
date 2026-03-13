import type { Integration, ListIntegrationsResponse } from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";
import { makeOrgRequest } from "@/services/utils";

const API_ENDPOINT = "/integrations";

interface UseIntegrationsResult {
  integrations: Integration[] | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => Promise<void>;
}

/**
 * Hook to fetch and manage integrations for the current organization
 */
export function useIntegrations(): UseIntegrationsResult {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId ? `/${orgId}${API_ENDPOINT}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListIntegrationsResponse>(
            orgId,
            API_ENDPOINT,
            ""
          );
          return response.integrations;
        }
      : null
  );

  return {
    integrations: data,
    error,
    isLoading,
    mutate: async () => {
      await mutate();
    },
  };
}
