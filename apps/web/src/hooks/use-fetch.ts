import { workflowService } from "@/services/workflowService";
import { deploymentService } from "@/services/deploymentService";
import { 
  useExecution, 
  usePublicExecution, 
  usePaginatedExecutions,
  EXECUTIONS_PAGE_SIZE,
  type PublicExecutionWithStructure
} from "@/services/executionsService";
import { apiRequest } from "@/utils/api";
import type {
  Workflow,
  WorkflowDeployment,
  WorkflowDeploymentVersion,
  WorkflowExecution,
  NodeType,
} from "@dafthunk/types";
import type { NodeTemplate } from "@/components/workflow/workflow-types";
import useSWR from "swr";
import { useInfinatePagination } from "./use-infinate-pagination";

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

export const useExecutions = (workflowId?: string, deploymentId?: string) => {
  return usePaginatedExecutions(workflowId, deploymentId);
};

export const useExecutionDetails = (executionId?: string) => {
  const { execution, executionError, isExecutionLoading, mutateExecution } = 
    useExecution(executionId || null);

  return {
    executionDetails: execution,
    executionDetailsError: executionError,
    isExecutionDetailsLoading: isExecutionLoading,
    mutateExecutionDetails: mutateExecution,
  };
};

export const usePublicExecutionDetails = (executionId?: string) => {
  const { publicExecution, publicExecutionError, isPublicExecutionLoading } = 
    usePublicExecution(executionId || null);

  return {
    publicExecutionDetails: publicExecution,
    publicExecutionDetailsError: publicExecutionError,
    isPublicExecutionDetailsLoading: isPublicExecutionLoading,
    mutatePublicExecutionDetails: () => Promise.resolve(),
  };
};
