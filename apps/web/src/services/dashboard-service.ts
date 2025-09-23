import {
  DashboardStats,
  DashboardStatsResponse,
  UsageCreditsResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoints for dashboard data
const DASHBOARD_API_ENDPOINT = "/dashboard";
const USAGE_API_ENDPOINT = "/usage";

interface UseDashboard {
  dashboardStats: DashboardStats | null;
  dashboardStatsError: Error | null;
  isDashboardStatsLoading: boolean;
  mutateDashboardStats: () => Promise<any>;
}

interface UseUsageCredits {
  usageData: UsageCreditsResponse | null;
  usageError: Error | null;
  isUsageLoading: boolean;
  mutateUsage: () => Promise<any>;
}

/**
 * Hook to fetch dashboard statistics for the current organization
 */
export const useDashboard = (): UseDashboard => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${DASHBOARD_API_ENDPOINT}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<DashboardStatsResponse>(
            orgHandle,
            DASHBOARD_API_ENDPOINT,
            ""
          );
          return response.stats;
        }
      : null
  );

  return {
    dashboardStats: data || null,
    dashboardStatsError: error || null,
    isDashboardStatsLoading: isLoading,
    mutateDashboardStats: mutate,
  };
};

/**
 * Hook to fetch usage credits for the current organization
 */
export const useUsageCredits = (): UseUsageCredits => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle
    ? `/${orgHandle}${USAGE_API_ENDPOINT}/credits`
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<UsageCreditsResponse>(
            orgHandle,
            USAGE_API_ENDPOINT,
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
