import { workflowService } from "@/services/workflowService";
import { deploymentService } from "@/services/deploymentService";
import { executionsService } from "@/services/executionsService";
import type { Execution } from "@/pages/executions";
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

export const useFetch = {
  useWorkflows() {
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
  },

  useWorkflowDetails(workflowId?: string) {
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
  },

  useDeployments() {
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
  },

  useDeploymentVersion(deploymentId?: string) {
    const { data, error, isLoading, mutate } =
      useSWR<WorkflowDeploymentVersion>(
        deploymentId ? `/deployments/version/${deploymentId}` : null,
        () => deploymentService.getVersion(deploymentId!)
      );

    return {
      deploymentVersion: data,
      deploymentVersionError: error,
      isDeploymentVersionLoading: isLoading,
      mutateDeploymentVersion: mutate,
    };
  },

  useDeploymentHistory(workflowId: string) {
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
  },

  useNodeTemplates() {
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
  },

  useDashboardStats() {
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
  },

  useExecutions() {
    const { data, error, isLoading, mutate } = useSWR<Execution[]>(
      "/executions",
      executionsService.getAll
    );

    return {
      executions: data,
      executionsError: error,
      isExecutionsLoading: isLoading,
      mutateExecutions: mutate,
    };
  },

  useExecutionDetails(executionId?: string) {
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
  },
};
