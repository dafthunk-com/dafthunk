import useSWR from "swr";
import {
  WorkflowWithMetadata,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  GetWorkflowResponse,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  DeleteWorkflowResponse,
  ListWorkflowsResponse,
  ExecuteWorkflowResponse,
  Edge,
} from "@dafthunk/types";
import { useAuth } from "@/components/authContext";
import { makeOrgRequest } from "./utils";
import { Edge as ReactFlowEdge, Connection } from "@xyflow/react";

// Base endpoint for workflows
const API_ENDPOINT_BASE = "/workflows";

/**
 * Type representing a connection validation result
 */
export type ConnectionValidationResult =
  | { status: "valid" }
  | { status: "invalid"; reason: string };

/**
 * Hook to list all workflows for the current organization
 */
export const useWorkflows = (): {
  workflows: WorkflowWithMetadata[];
  workflowsError: Error | null;
  isWorkflowsLoading: boolean;
  mutateWorkflows: () => Promise<any>;
} => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListWorkflowsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.workflows;
        }
      : null
  );

  return {
    workflows: data || [],
    workflowsError: error || null,
    isWorkflowsLoading: isLoading,
    mutateWorkflows: mutate,
  };
};

/**
 * Hook to get a specific workflow by ID
 */
export const useWorkflow = (id: string | null) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle and workflow ID
  const swrKey =
    orgHandle && id ? `/${orgHandle}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle && id
      ? async () => {
          return await makeOrgRequest<GetWorkflowResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    workflow: data,
    workflowError: error || null,
    isWorkflowLoading: isLoading,
    mutateWorkflow: mutate,
  };
};

/**
 * Create a new workflow for the current organization
 */
export const createWorkflow = async (
  request: CreateWorkflowRequest,
  orgHandle: string
): Promise<WorkflowWithMetadata> => {
  const response = await makeOrgRequest<CreateWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Update an existing workflow
 */
export const updateWorkflow = async (
  id: string,
  request: UpdateWorkflowRequest,
  orgHandle: string
): Promise<WorkflowWithMetadata> => {
  const response = await makeOrgRequest<UpdateWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Delete a workflow by ID
 */
export const deleteWorkflow = async (
  id: string,
  orgHandle: string
): Promise<DeleteWorkflowResponse> => {
  return await makeOrgRequest<DeleteWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};

/**
 * Execute a workflow by ID
 */
export const executeWorkflow = async (
  id: string,
  orgHandle: string,
  monitorProgress: boolean = false,
  parameters?: Record<string, any>
): Promise<ExecuteWorkflowResponse> => {
  return await makeOrgRequest<ExecuteWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}/execute${monitorProgress ? "?monitorProgress=true" : ""}`,
    {
      method: "POST",
      ...(parameters && { body: JSON.stringify(parameters) }),
    }
  );
};

/**
 * Deploy a workflow
 */
export const deployWorkflow = async (
  id: string,
  orgHandle: string
): Promise<void> => {
  await makeOrgRequest<void>(orgHandle, "/deployments", "", {
    method: "POST",
    body: JSON.stringify({ workflowId: id }),
  });
};

/**
 * Converts workflow edges to ReactFlow compatible edges
 */
export const convertToReactFlowEdges = (
  edges: readonly Edge[]
): readonly ReactFlowEdge[] => {
  return edges.map((edge, index) => ({
    id: `e${index}`,
    type: "workflowEdge",
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceOutput,
    targetHandle: edge.targetInput,
  }));
};

/**
 * Converts a ReactFlow connection to a workflow edge
 */
export const convertToWorkflowEdge = (connection: Connection): Edge => {
  if (!connection.source || !connection.target) {
    throw new Error("Invalid connection: missing source or target");
  }

  return {
    source: connection.source,
    target: connection.target,
    sourceOutput: connection.sourceHandle || "",
    targetInput: connection.targetHandle || "",
  };
};

/**
 * Validates a connection between two nodes
 */
export const validateConnection = (
  connection: Connection,
  edges: readonly ReactFlowEdge[]
): ConnectionValidationResult => {
  if (!connection.source || !connection.target) {
    return {
      status: "invalid",
      reason: "Missing source or target",
    };
  }

  const sourceNode = connection.source;
  const targetNode = connection.target;

  // Prevent self-connections
  if (sourceNode === targetNode) {
    return {
      status: "invalid",
      reason: "Cannot connect a node to itself",
    };
  }

  // Check for direct cycles (A→B→A)
  const directCycle = edges.some(
    (edge) => edge.source === targetNode && edge.target === sourceNode
  );

  if (directCycle) {
    return {
      status: "invalid",
      reason: "Would create a direct cycle",
    };
  }

  // Check for indirect cycles (A→B→C→A)
  if (wouldCreateIndirectCycle(sourceNode, targetNode, edges)) {
    return {
      status: "invalid",
      reason: "Would create an indirect cycle",
    };
  }

  return { status: "valid" };
};

/**
 * Checks if adding an edge would create an indirect cycle in the graph
 * @private Used internally by validateConnection
 */
const wouldCreateIndirectCycle = (
  sourceNode: string,
  targetNode: string,
  edges: readonly ReactFlowEdge[]
): boolean => {
  // Use depth-first search to check if target can reach source
  const visited = new Set<string>();

  const dfs = (currentNode: string): boolean => {
    if (currentNode === sourceNode) return true;
    if (visited.has(currentNode)) return false;

    visited.add(currentNode);

    // Find all outgoing edges from current node
    const outgoingEdges = edges.filter((edge) => edge.source === currentNode);

    for (const edge of outgoingEdges) {
      if (dfs(edge.target)) return true;
    }

    return false;
  };

  return dfs(targetNode);
};
