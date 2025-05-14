import { apiRequest } from "@/utils/api";
import type { NodeType } from "@dafthunk/types";
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
