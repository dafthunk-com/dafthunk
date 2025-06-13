import { UsageCreditsResponse } from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for usage data
const API_ENDPOINT_BASE = "/usage";

interface UseUsageCredits {
  usageData: UsageCreditsResponse | null;
  usageError: Error | null;
  isUsageLoading: boolean;
  mutateUsage: () => Promise<any>;
}

/**
 * Hook to fetch usage credits for the current organization
 */
export const useUsageCredits = (): UseUsageCredits => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}/credits` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<UsageCreditsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            "/credits"
          );
          return response;
        }
      : null
  );

  return {
    usageData: data || null,
    usageError: error || null,
    isUsageLoading: isLoading,
    mutateUsage: mutate,
  };
};
