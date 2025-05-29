import { GetNodeTypesResponse, NodeType, WorkflowType } from "@dafthunk/types";
import useSWR from "swr";

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
 * @param workflowType Optional workflow type to filter node types by compatibility
 */
export const useNodeTypes = (workflowType?: WorkflowType): UseNodeTypes => {
  // Create a unique SWR key that includes the workflow type
  const swrKey = `${API_ENDPOINT_BASE}${workflowType ? `?workflowType=${workflowType}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, async () => {
    const endpoint = `${API_ENDPOINT_BASE}${workflowType ? `?workflowType=${workflowType}` : ""}`;
    const response = await makeRequest<GetNodeTypesResponse>(endpoint);
    return response.nodeTypes;
  });

  return {
    nodeTypes: data || [],
    nodeTypesError: error || null,
    isNodeTypesLoading: isLoading,
    mutateNodeTypes: mutate,
  };
};
