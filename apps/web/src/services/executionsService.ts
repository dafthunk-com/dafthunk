import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { 
  WorkflowExecution, 
  ListExecutionsRequest, 
  ListExecutionsResponse, 
  GetExecutionResponse, 
  PublicExecutionWithStructure, 
  GetPublicExecutionResponse,
  UpdateExecutionVisibilityResponse
} from "@dafthunk/types";
import { apiRequest } from "@/utils/api";
import { useAuth } from '@/components/authContext';
import { makeOrgRequest } from './utils';
import { mutate } from "swr";
import { useInfinatePagination } from "@/hooks/use-infinate-pagination";

// Base endpoint for executions
const API_ENDPOINT_BASE = '/executions';

// Default page size for pagination
export const EXECUTIONS_PAGE_SIZE = 20;

// Re-export PublicExecutionWithStructure to maintain compatibility
export type { PublicExecutionWithStructure } from "@dafthunk/types";

interface UseExecutions {
  executions: WorkflowExecution[];
  executionsError: Error | null;
  isExecutionsLoading: boolean;
  mutateExecutions: () => Promise<any>;
}

interface UsePaginatedExecutions {
  paginatedExecutions: WorkflowExecution[];
  executionsError: Error | null;
  isExecutionsInitialLoading: boolean;
  isExecutionsLoadingMore: boolean;
  mutateExecutions: () => Promise<any>;
  isExecutionsReachingEnd: boolean;
  executionsObserverTargetRef: React.RefObject<HTMLDivElement | null>;
}

interface UseExecution {
  execution: WorkflowExecution | undefined;
  executionError: Error | null;
  isExecutionLoading: boolean;
  mutateExecution: () => Promise<any>;
}

interface UsePublicExecution {
  publicExecution: PublicExecutionWithStructure | undefined;
  publicExecutionError: Error | null;
  isPublicExecutionLoading: boolean;
}

/**
 * Hook to list executions with optional filtering
 */
export const useExecutions = (params?: Partial<ListExecutionsRequest>): UseExecutions => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (params?.workflowId) queryParams.append('workflowId', params.workflowId);
  if (params?.deploymentId) queryParams.append('deploymentId', params.deploymentId);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  
  const queryString = queryParams.toString();
  const path = queryString ? `?${queryString}` : '';

  // Create a unique SWR key that includes the organization handle and query params
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}${path}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle ? async () => {
      const response = await makeOrgRequest<ListExecutionsResponse>(
        orgHandle,
        API_ENDPOINT_BASE,
        path
      );
      return response.executions;
    } : null
  );

  return {
    executions: data || [],
    executionsError: error || null,
    isExecutionsLoading: isLoading,
    mutateExecutions: mutate,
  };
};

/**
 * Hook to use paginated executions with infinite scroll
 */
export const usePaginatedExecutions = (workflowId?: string, deploymentId?: string): UsePaginatedExecutions => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const getKey = (pageIndex: number, previousPageData: WorkflowExecution[] | null) => {
    if (previousPageData && 
        (!previousPageData.length || previousPageData.length < EXECUTIONS_PAGE_SIZE)) {
      return null; // Reached the end
    }

    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.append('offset', String(pageIndex * EXECUTIONS_PAGE_SIZE));
    queryParams.append('limit', String(EXECUTIONS_PAGE_SIZE));
    
    if (workflowId) queryParams.append('workflowId', workflowId);
    if (deploymentId) queryParams.append('deploymentId', deploymentId);

    const queryString = queryParams.toString();
    return orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}?${queryString}` : null;
  };

  const fetcher = async (url: string): Promise<WorkflowExecution[]> => {
    if (!orgHandle) return [];
    
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname.replace(`/${orgHandle}`, '');
    const query = urlObj.search;
    
    const response = await makeOrgRequest<ListExecutionsResponse>(
      orgHandle,
      path,
      query
    );
    
    return response.executions;
  };

  const {
    paginatedData,
    error,
    isInitialLoading,
    isLoadingMore,
    mutate,
    isReachingEnd,
    observerTargetRef,
  } = useInfinatePagination<WorkflowExecution>(getKey, fetcher, {
    pageSize: EXECUTIONS_PAGE_SIZE,
    revalidateFirstPage: true,
    revalidateOnMount: true,
    refreshInterval: 5000, // Regular refresh to see execution status updates
  });

  return {
    paginatedExecutions: paginatedData,
    executionsError: error,
    isExecutionsInitialLoading: isInitialLoading,
    isExecutionsLoadingMore: isLoadingMore,
    mutateExecutions: mutate,
    isExecutionsReachingEnd: isReachingEnd,
    executionsObserverTargetRef: observerTargetRef,
  };
};

/**
 * Hook to get a single execution by ID
 */
export const useExecution = (executionId: string | null): UseExecution => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;
  
  const swrKey = executionId && orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}/${executionId}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle ? async () => {
      const response = await makeOrgRequest<GetExecutionResponse>(
        orgHandle,
        API_ENDPOINT_BASE,
        `/${executionId}`
      );
      return response.execution;
    } : null
  );

  return {
    execution: data,
    executionError: error,
    isExecutionLoading: isLoading,
    mutateExecution: mutate,
  };
};

/**
 * Hook to get a public execution by ID (no authentication required)
 */
export const usePublicExecution = (executionId: string | null): UsePublicExecution => {
  const swrKey = executionId ? `${API_ENDPOINT_BASE}/public/${executionId}` : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    swrKey ? async () => {
      const response = await apiRequest<GetPublicExecutionResponse>(
        `${API_ENDPOINT_BASE}/public/${executionId}`,
        {
          method: "GET",
          errorMessage: `Failed to fetch public execution details for ID: ${executionId}`,
        }
      );
      return response.execution;
    } : null
  );

  return {
    publicExecution: data,
    publicExecutionError: error,
    isPublicExecutionLoading: isLoading,
  };
};

/**
 * Set an execution's visibility to public
 */
export const setExecutionPublic = async (executionId: string, orgHandle: string): Promise<boolean> => {
  const response = await makeOrgRequest<UpdateExecutionVisibilityResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${executionId}/share/public`,
    {
      method: "PATCH",
    }
  );
  
  // Invalidate all execution related queries
  await mutate((key) => typeof key === "string" && key.includes(API_ENDPOINT_BASE));
  
  return response.success;
};

/**
 * Set an execution's visibility to private
 */
export const setExecutionPrivate = async (executionId: string, orgHandle: string): Promise<boolean> => {
  const response = await makeOrgRequest<UpdateExecutionVisibilityResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${executionId}/share/private`,
    {
      method: "PATCH",
    }
  );
  
  // Invalidate all execution related queries
  await mutate((key) => typeof key === "string" && key.includes(API_ENDPOINT_BASE));
  
  return response.success;
};

// Legacy service object (for backward compatibility)
export const executionsService = {
  getAll: async (params: { offset: number; limit: number; workflowId?: string; deploymentId?: string }): Promise<WorkflowExecution[]> => {
    const { offset, limit, workflowId, deploymentId } = params;
    
    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', limit.toString());
    if (workflowId) queryParams.append('workflowId', workflowId);
    if (deploymentId) queryParams.append('deploymentId', deploymentId);
    
    const url = `${API_ENDPOINT_BASE}?${queryParams.toString()}`;
    
    const data = await apiRequest<ListExecutionsResponse>(url, {
      method: "GET",
      errorMessage: "Failed to fetch executions list",
    });
    
    return data.executions;
  },

  getById: async (executionId: string): Promise<WorkflowExecution> => {
    const response = await apiRequest<GetExecutionResponse>(`${API_ENDPOINT_BASE}/${executionId}`, {
      method: "GET",
      errorMessage: `Failed to fetch execution details for ID: ${executionId}`,
    });
    
    return response.execution;
  },

  getPublicById: async (executionId: string): Promise<PublicExecutionWithStructure> => {
    const response = await apiRequest<GetPublicExecutionResponse>(
      `${API_ENDPOINT_BASE}/public/${executionId}`,
      {
        method: "GET",
        errorMessage: `Failed to fetch public execution details for ID: ${executionId}`,
      }
    );
    
    return response.execution;
  },

  setExecutionPublic: async (executionId: string): Promise<void> => {
    await apiRequest<UpdateExecutionVisibilityResponse>(`${API_ENDPOINT_BASE}/${executionId}/share/public`, {
      method: "PATCH",
      errorMessage: `Failed to set execution ${executionId} to public`,
    });
    
    await mutate((key) => typeof key === "string" && key.includes(API_ENDPOINT_BASE));
  },

  setExecutionPrivate: async (executionId: string): Promise<void> => {
    await apiRequest<UpdateExecutionVisibilityResponse>(`${API_ENDPOINT_BASE}/${executionId}/share/private`, {
      method: "PATCH",
      errorMessage: `Failed to set execution ${executionId} to private`,
    });
    
    await mutate((key) => typeof key === "string" && key.includes(API_ENDPOINT_BASE));
  },
};
