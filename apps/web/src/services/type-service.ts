import { GetNodeTypesResponse, NodeType } from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for node types
const API_ENDPOINT_BASE = "/types";

export interface UseNodeTypes {
  nodeTypes: NodeType[];
  nodeTypesError: Error | null;
  isNodeTypesLoading: boolean;
  mutateNodeTypes: () => Promise<any>;
}

/**
 * Hook to fetch all available node types for the current organization
 */
export const useNodeTypes = (): UseNodeTypes => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<GetNodeTypesResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.nodeTypes;
        }
      : null
  );

  return {
    nodeTypes: data || [],
    nodeTypesError: error || null,
    isNodeTypesLoading: isLoading,
    mutateNodeTypes: mutate,
  };
};
