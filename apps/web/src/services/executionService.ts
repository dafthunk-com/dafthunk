import {
  GetExecutionResponse,
  GetPublicExecutionResponse,
  ListExecutionsResponse,
  PublicExecutionWithStructure,
  UpdateExecutionVisibilityResponse,
  WorkflowExecution,
} from "@dafthunk/types";
import useSWR, { mutate } from "swr";

import { useAuth } from "@/components/auth-context";
import { useInfinatePagination } from "@/hooks/use-infinate-pagination";

import { makeRequest } from "./utils";
import { makeOrgRequest } from "./utils";

// Base endpoint for executions
const API_ENDPOINT_BASE = "/executions";

// Default page size for pagination
export const EXECUTIONS_PAGE_SIZE = 20;

// Re-export PublicExecutionWithStructure to maintain compatibility
export type { PublicExecutionWithStructure } from "@dafthunk/types";

//-----------------------------------------------------------------------
// Hook Return Types
//-----------------------------------------------------------------------

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
  execution: WorkflowExecution | null;
  executionError: Error | null;
  isExecutionLoading: boolean;
  mutateExecution: () => Promise<any>;
}

interface UsePublicExecution {
  publicExecution: PublicExecutionWithStructure | null;
  publicExecutionError: Error | null;
  isPublicExecutionLoading: boolean;
  mutatePublicExecution: () => Promise<any>;
}

//-----------------------------------------------------------------------
// Hooks
//-----------------------------------------------------------------------

/**
 * Hook to use paginated executions with infinite scroll
 */
export const usePaginatedExecutions = (
  workflowId?: string,
  deploymentId?: string
): UsePaginatedExecutions => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const getKey = (
    pageIndex: number,
    previousPageData: WorkflowExecution[] | null
  ) => {
    if (
      previousPageData &&
      (!previousPageData.length ||
        previousPageData.length < EXECUTIONS_PAGE_SIZE)
    ) {
      return null; // Reached the end
    }

    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.append("offset", String(pageIndex * EXECUTIONS_PAGE_SIZE));
    queryParams.append("limit", String(EXECUTIONS_PAGE_SIZE));

    if (workflowId) queryParams.append("workflowId", workflowId);
    if (deploymentId) queryParams.append("deploymentId", deploymentId);

    const queryString = queryParams.toString();
    return orgHandle
      ? `/${orgHandle}${API_ENDPOINT_BASE}?${queryString}`
      : null;
  };

  const fetcher = async (url: string): Promise<WorkflowExecution[]> => {
    if (!orgHandle) return [];

    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname.replace(`/${orgHandle}`, "");
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
 * Hook to get execution details for an execution ID
 */
export const useExecution = (executionId: string | null): UseExecution => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey =
    orgHandle && executionId
      ? `/${orgHandle}${API_ENDPOINT_BASE}/${executionId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey
      ? async () => {
          const response = await makeOrgRequest<GetExecutionResponse>(
            orgHandle!,
            API_ENDPOINT_BASE,
            `/${executionId}`
          );
          return response.execution;
        }
      : null
  );

  return {
    execution: data || null,
    executionError: error || null,
    isExecutionLoading: isLoading,
    mutateExecution: mutate,
  };
};

/**
 * Hook to get public execution details
 */
export const usePublicExecution = (
  executionId: string | null
): UsePublicExecution => {
  const swrKey = `/public/executions/${executionId}`;

  const { data, error, isLoading, mutate } = useSWR(
    executionId ? swrKey : null,
    executionId ? () => getPublicExecution(executionId) : null
  );

  return {
    publicExecution: data || null,
    publicExecutionError: error || null,
    isPublicExecutionLoading: isLoading,
    mutatePublicExecution: mutate,
  };
};

/**
 * Get a single execution by ID
 */
export const getExecution = async (
  executionId: string,
  orgHandle: string
): Promise<WorkflowExecution> => {
  const response = await makeOrgRequest<GetExecutionResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${executionId}`
  );

  return response.execution;
};

/**
 * Get a public execution by ID
 */
export const getPublicExecution = async (
  executionId: string
): Promise<PublicExecutionWithStructure> => {
  const response = await makeRequest<GetPublicExecutionResponse>(
    `/public/executions/${executionId}`
  );

  return response.execution;
};

/**
 * Set an execution's visibility to public
 */
export const setExecutionPublic = async (
  executionId: string,
  orgHandle: string
): Promise<boolean> => {
  const response = await makeOrgRequest<UpdateExecutionVisibilityResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${executionId}/share/public`,
    {
      method: "PATCH",
    }
  );

  // Invalidate all execution related queries
  await mutate(
    (key) => typeof key === "string" && key.includes(API_ENDPOINT_BASE)
  );

  return response.success;
};

/**
 * Set an execution's visibility to private
 */
export const setExecutionPrivate = async (
  executionId: string,
  orgHandle: string
): Promise<boolean> => {
  const response = await makeOrgRequest<UpdateExecutionVisibilityResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${executionId}/share/private`,
    {
      method: "PATCH",
    }
  );

  // Invalidate all execution related queries
  await mutate(
    (key) => typeof key === "string" && key.includes(API_ENDPOINT_BASE)
  );

  return response.success;
};
