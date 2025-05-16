import { Node as ReactFlowNode, XYPosition } from "@xyflow/react";
import { Node, NodeType, GetNodeTypesResponse } from "@dafthunk/types";
import { NodeExecutionState } from "@/components/workflow/workflow-types";
import { WorkflowNodeType } from "@/components/workflow/workflow-types";
import useSWR from "swr";
import { makeOrgRequest } from "./utils";
import { useAuth } from "@/components/auth-context";

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

/**
 * Converts domain nodes to ReactFlow compatible nodes
 */
export function convertToReactFlowNodes(
  nodes: readonly Node[]
): readonly ReactFlowNode<WorkflowNodeType>[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "workflowNode",
    position: node.position,
    data: {
      name: node.name,
      inputs: node.inputs.map((input) => ({ ...input, id: input.name })),
      outputs: node.outputs.map((output) => ({ ...output, id: output.name })),
      error: node.error,
      executionState: "idle" as NodeExecutionState,
    },
  }));
}

/**
 * Creates a new node from a template at the specified position
 */
export function createNode(template: NodeType, position: XYPosition): Node {
  return {
    id: `node-${Date.now()}`,
    type: template.id,
    name: template.name,
    position,
    inputs: template.inputs.map((input) => ({
      ...input,
      id: input.name,
    })),
    outputs: template.outputs.map((output) => ({
      ...output,
      id: output.name,
    })),
  };
}

/**
 * Updates the execution state of a specific node in the node collection
 */
export function updateNodeExecutionState(
  nodes: readonly ReactFlowNode[],
  nodeId: string,
  state: NodeExecutionState
): readonly ReactFlowNode[] {
  return nodes.map((node) =>
    node.id === nodeId
      ? { ...node, data: { ...node.data, executionState: state } }
      : node
  );
}

/**
 * Legacy function to fetch available node types from the API
 * @deprecated Use useNodeTypes hook instead
 */
export async function fetchNodeTypes(
  orgHandle: string
): Promise<readonly NodeType[]> {
  try {
    const response = await makeOrgRequest<GetNodeTypesResponse>(
      orgHandle,
      API_ENDPOINT_BASE,
      ""
    );
    return response.nodeTypes;
  } catch (error) {
    console.error("Error fetching node types:", error);
    throw new Error(
      `Failed to load node types: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
