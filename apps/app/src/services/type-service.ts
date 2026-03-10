import type { GetNodeTypesResponse, NodeType } from "@dafthunk/types";
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
 */
export const useNodeTypes = (
  options?: SWRConfiguration<NodeType[]>
): UseNodeTypes => {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINT_BASE,
    async () => {
      const response = await makeRequest<GetNodeTypesResponse>(API_ENDPOINT_BASE);
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
