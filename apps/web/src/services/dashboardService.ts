import useSWR from 'swr';
import { DashboardStats, DashboardStatsResponse } from '@dafthunk/types';
import { useAuth } from '@/components/authContext';
import { makeOrgRequest } from './utils';

// Base endpoint for dashboard data
const API_ENDPOINT_BASE = '/dashboard';

interface UseDashboard {
  dashboardStats: DashboardStats | null;
  dashboardStatsError: Error | null;
  isDashboardStatsLoading: boolean;
  mutateDashboardStats: () => Promise<any>;
}

/**
 * Hook to fetch dashboard statistics for the current organization
 */
export const useDashboard = (): UseDashboard => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle ? async () => {
      const response = await makeOrgRequest<DashboardStatsResponse>(
        orgHandle,
        API_ENDPOINT_BASE,
        ''
      );
      return response.stats;
    } : null
  );

  return {
    dashboardStats: data || null,
    dashboardStatsError: error || null,
    isDashboardStatsLoading: isLoading,
    mutateDashboardStats: mutate,
  };
}; 