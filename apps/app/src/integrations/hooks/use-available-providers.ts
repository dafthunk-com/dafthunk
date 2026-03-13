import type { IntegrationProvider } from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";
import { makeOrgRequest } from "@/services/utils";

const API_ENDPOINT = "/integrations/providers";

interface UseAvailableProvidersResult {
  providers: IntegrationProvider[] | undefined;
  error: Error | undefined;
  isLoading: boolean;
}

interface AvailableProvidersResponse {
  providers: IntegrationProvider[];
}

/**
 * Hook to fetch available integration providers from the backend
 * Only returns providers that are configured in the environment
 */
export function useAvailableProviders(): UseAvailableProvidersResult {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId ? `/${orgId}${API_ENDPOINT}` : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<AvailableProvidersResponse>(
            orgId,
            API_ENDPOINT,
            ""
          );
          return response.providers;
        }
      : null
  );

  return {
    providers: data,
    error,
    isLoading,
  };
}
