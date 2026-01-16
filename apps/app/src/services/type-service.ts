import {
  GetNodeTypesResponse,
  NodeType,
  WorkflowTrigger,
} from "@dafthunk/types";
import useSWR, { type SWRConfiguration } from "swr";

import { makeRequest } from "./utils";

// Base endpoint for node types - now public
const API_ENDPOINT_BASE = "/types";

export interface UseNodeTypes {
  nodeTypes: NodeType[];
  nodeTypesError: Error | null;
  isNodeTypesLoading: boolean;
  mutateNodeTypes: () => Promise<any>;
}

/**
 * Hook to fetch available node types (now public endpoint)
 * @param workflowTrigger Optional workflow trigger to filter node types by compatibility
 */
export const useNodeTypes = (
  workflowTrigger?: WorkflowTrigger,
  options?: SWRConfiguration<NodeType[]>
): UseNodeTypes => {
  // Create a unique SWR key that includes the workflow trigger
  const swrKey = `${API_ENDPOINT_BASE}${workflowTrigger ? `?workflowTrigger=${workflowTrigger}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const endpoint = `${API_ENDPOINT_BASE}${workflowTrigger ? `?workflowTrigger=${workflowTrigger}` : ""}`;
      const response = await makeRequest<GetNodeTypesResponse>(endpoint);
      return response.nodeTypes;
    },
    options
  );

  return {
    nodeTypes: data || [],
    nodeTypesError: error || null,
    isNodeTypesLoading: isLoading,
    mutateNodeTypes: mutate,
  };
};
