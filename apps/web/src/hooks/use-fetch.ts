import { workflowService } from "@/services/workflowService";
import { apiRequest } from "@/utils/api";
import type { Workflow, NodeType } from "@dafthunk/types";
import type { NodeTemplate } from "@/components/workflow/workflow-types";
import useSWR from "swr";

// Re-export deployments hooks for backward compatibility
export {
  useDeployments,
  useDeploymentVersion,
  useDeploymentHistory,
} from "@/services/deploymentService";

// Re-export executions hooks for backward compatibility
export {
  useExecutionDetails,
  usePublicExecutionDetails,
  useExecutions,
} from "@/services/executionsService";

export const PAGE_SIZE = 20;

/**
 * Hook to fetch all workflows
 */
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

/**
 * Hook to fetch a specific workflow by ID
 */
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

/**
 * Hook to fetch node templates
 */
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
