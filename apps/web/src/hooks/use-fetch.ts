import { workflowService } from "@/services/workflowService";
import { deploymentService } from "@/services/deploymentService";
import { executionsService } from "@/services/executionsService";
import { apiKeysService } from "@/services/apiKeysService";
import type { ApiToken } from "@/services/apiKeysService";
import { apiRequest } from "@/utils/api";
import type {
  Workflow,
  WorkflowDeployment,
  WorkflowDeploymentVersion,
  WorkflowExecution,
  NodeType,
} from "@dafthunk/types";
import type { NodeTemplate } from "@/components/workflow/workflow-types";
import type { Execution } from "@/pages/executions";
import useSWR from "swr";
import { useInfinatePagination } from "./use-infinate-pagination";

export type DashboardStats = {
  workflows: number;
  deployments: number;
  executions: {
    total: number;
    running: number;
    failed: number;
    avgTimeSeconds: number;
  };
  recentExecutions: Array<{
    id: string;
    workflowName: string;
    status: string;
    startedAt: number;
  }>;
};

export const PAGE_SIZE = 20;

export const useWorkflows = () => {
  const { data, error, isLoading, mutate } = useSWR<Workflow[]>(
    "/workflows",
    workflowService.getAll
  );

  return {
    workflows: data,
    workflowsError: error,
    isWorkflowsLoading: isLoading,
    mutateWorkflows: mutate,
  };
};

export const useWorkflowDetails = (workflowId?: string) => {
  const { data, error, isLoading, mutate } = useSWR<Workflow>(
    workflowId ? `/workflows/${workflowId}` : null,
    () => workflowService.getById(workflowId!)
  );

  return {
    workflowDetails: data,
    workflowDetailsError: error,
    isWorkflowDetailsLoading: isLoading,
    mutateWorkflowDetails: mutate,
  };
};

export const useDeployments = () => {
  const { data, error, isLoading, mutate } = useSWR<WorkflowDeployment[]>(
    "/deployments",
    deploymentService.getAll
  );

  return {
    deployments: data,
    deploymentsError: error,
    isDeploymentsLoading: isLoading,
    mutateDeployments: mutate,
  };
};

export const useDeploymentVersion = (deploymentId?: string) => {
  const { data, error, isLoading, mutate } = useSWR<WorkflowDeploymentVersion>(
    deploymentId ? `/deployments/version/${deploymentId}` : null,
    () => deploymentService.getVersion(deploymentId!)
  );

  return {
    deploymentVersion: data,
    deploymentVersionError: error,
    isDeploymentVersionLoading: isLoading,
    mutateDeploymentVersion: mutate,
  };
};

export const useDeploymentHistory = (workflowId: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    `/deployments/history/${workflowId}`,
    () => deploymentService.getHistory(workflowId)
  );

  return {
    deploymentHistory: data,
    deploymentHistoryError: error,
    isDeploymentHistoryLoading: isLoading,
    mutateDeploymentHistory: mutate,
  };
};

export const useNodeTemplates = () => {
  const { data, error, isLoading } = useSWR<NodeTemplate[], Error, string>(
    "/types",
    (key) =>
      apiRequest<NodeType[]>(key).then((types) =>
        types.map((type) => ({
          id: type.id,
          type: type.id,
          name: type.name,
          description: type.description || "",
          category: type.category,
          inputs: type.inputs.map((input) => ({
            id: input.name,
            type: input.type,
            name: input.name,
            hidden: input.hidden,
          })),
          outputs: type.outputs.map((output) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            hidden: output.hidden,
          })),
        }))
      )
  );

  return {
    nodeTemplates: data,
    nodeTemplatesError: error,
    isNodeTemplatesLoading: isLoading,
  };
};

export const useDashboardStats = () => {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    "/dashboard",
    apiRequest
  );

  return {
    dashboardStats: data,
    dashboardStatsError: error,
    isDashboardStatsLoading: isLoading,
    mutateDashboardStats: mutate,
  };
};

export const useExecutions = () => {
  const getKey = (
    pageIndex: number,
    previousPageData: Execution[] | null
  ): string | null => {
    if (
      previousPageData &&
      (!previousPageData.length || previousPageData.length < PAGE_SIZE)
    ) {
      return null;
    }
    const offset = pageIndex * PAGE_SIZE;
    return `/executions?offset=${offset}&limit=${PAGE_SIZE}`;
  };

  const fetcher = async (url: string): Promise<Execution[]> => {
    const params = new URLSearchParams(url.substring(url.indexOf("?") + 1));
    const offset = parseInt(params.get("offset") || "0", 10);
    const limit = parseInt(params.get("limit") || String(PAGE_SIZE), 10);
    return executionsService.getAll({ offset, limit });
  };

  const {
    paginatedData,
    error,
    isInitialLoading,
    isLoadingMore,
    mutate,
    isReachingEnd,
    observerTargetRef,
  } = useInfinatePagination<Execution>(getKey, fetcher, {
    pageSize: PAGE_SIZE,
    revalidateFirstPage: false,
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

export const useExecutionDetails = (executionId?: string) => {
  const { data, error, isLoading, mutate } = useSWR<WorkflowExecution>(
    executionId ? `/executions/${executionId}` : null,
    () => executionsService.getById(executionId!)
  );

  return {
    executionDetails: data,
    executionDetailsError: error,
    isExecutionDetailsLoading: isLoading,
    mutateExecutionDetails: mutate,
  };
};

export const useApiKeys = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiToken[]>(
    "/tokens",
    apiKeysService.getAll
  );

  return {
    apiKeys: data,
    apiKeysError: error,
    isApiKeysLoading: isLoading,
    mutateApiKeys: mutate,
  };
};
