import type { NodeTemplate } from "@/components/workflow/workflow-types";
import useSWR from "swr";
import { useNodeTypes } from "@/services/workflowNodeService";

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
 * @deprecated Use useNodeTypes from @/services/workflowNodeService instead
 */
export const useNodeTemplates = () => {
  // Use the new implementation internally
  const { nodeTypes, nodeTypesError, isNodeTypesLoading } = useNodeTypes();
  
  // Transform nodeTypes to the format expected by components using useNodeTemplates
  const nodeTemplates = nodeTypes?.map((type) => ({
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
  }));

  return {
    nodeTemplates,
    nodeTemplatesError: nodeTypesError,
    isNodeTemplatesLoading: isNodeTypesLoading,
  };
};
