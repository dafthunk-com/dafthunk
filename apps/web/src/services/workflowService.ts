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
  Node,
  NodeType,
  GetNodeTypesResponse,
  Workflow,
} from "@dafthunk/types";
import { useAuth } from "@/components/authContext";
import { makeOrgRequest } from "./utils";
import {
  Edge as ReactFlowEdge,
  Connection,
  Node as ReactFlowNode,
  XYPosition,
} from "@xyflow/react";
import { NodeExecutionState } from "@/components/workflow/workflow-types.tsx";
import { WorkflowNodeType } from "@/components/workflow/workflow-types";

// Base endpoint for workflows
const API_ENDPOINT_BASE = "/workflows";

// Base endpoint for node types
const NODE_TYPES_API_ENDPOINT = "/types";

/**
 * Type representing a connection validation result
 */
export type ConnectionValidationResult =
  | { status: "valid" }
  | { status: "invalid"; reason: string };

/**
 * Interface for the useNodeTypes hook return value
 */
interface UseNodeTypes {
  nodeTypes: NodeType[];
  nodeTypesError: Error | null;
  isNodeTypesLoading: boolean;
  mutateNodeTypes: () => Promise<any>;
}

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
 * Hook to fetch all available node types for a specific organization
 * @param orgHandle The organization handle
 */
export const useNodeTypes = (orgHandle: string | undefined): UseNodeTypes => {
  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${NODE_TYPES_API_ENDPOINT}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          try {
            const response = await makeOrgRequest<GetNodeTypesResponse>(
              orgHandle,
              NODE_TYPES_API_ENDPOINT,
              ""
            );
            return response.nodeTypes;
          } catch (err) {
            console.error("Error fetching node types:", err);
            throw err;
          }
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
  options?: {
    mode?: "dev" | "latest" | string; // "dev", "latest", or a version number
    monitorProgress?: boolean;
    parameters?: Record<string, any>;
  }
): Promise<ExecuteWorkflowResponse> => {
  const { mode = "dev", monitorProgress = false, parameters } = options || {};

  // Build the endpoint path based on the mode
  let endpoint = `/${id}/execute`;
  if (mode === "dev") {
    endpoint += "/dev";
  } else if (mode === "latest") {
    endpoint += "/latest";
  } else {
    // If mode is a version number, use it directly
    endpoint += `/${mode}`;
  }

  // Add monitorProgress query parameter if needed
  if (monitorProgress) {
    endpoint += "?monitorProgress=true";
  }

  return await makeOrgRequest<ExecuteWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    endpoint,
    {
      method: "POST",
      ...(parameters && { body: JSON.stringify(parameters) }),
    }
  );
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
 * Fetch all available node types for a specific organization
 * @param orgHandle The organization handle
 */
export const fetchNodeTypes = async (
  orgHandle: string
): Promise<NodeType[]> => {
  try {
    const response = await makeOrgRequest<GetNodeTypesResponse>(
      orgHandle,
      NODE_TYPES_API_ENDPOINT,
      ""
    );
    return response.nodeTypes;
  } catch (error) {
    console.error("Error fetching node types:", error);
    throw new Error(
      `Failed to load node types: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

/**
 * Type representing a workflow validation result
 */
export type ValidationResult = {
  readonly isValid: boolean;
  readonly errors: readonly string[];
};

/**
 * Validates if a workflow has all required properties
 */
export function validateWorkflow(workflow: Workflow): ValidationResult {
  const errors: string[] = [
    ...validateNodes(workflow.nodes),
    ...validateEdgeConnections(workflow),
    ...(hasCycles(workflow) ? ["Workflow contains cycles"] : []),
  ];

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that all nodes have required properties
 */
function validateNodes(nodes: readonly Node[]): string[] {
  const errors: string[] = [];

  for (const node of nodes) {
    if (!node.id || !node.name) {
      errors.push(
        `Node ${node.id || "unknown"} is missing required properties`
      );
    }
  }

  return errors;
}

/**
 * Validates that all edges connect to existing nodes
 */
function validateEdgeConnections(workflow: Workflow): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(workflow.nodes.map((node) => node.id));

  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge source node ${edge.source} not found`);
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge target node ${edge.target} not found`);
    }
  }

  return errors;
}

/**
 * Checks if a workflow contains cycles using DFS
 */
export function hasCycles(workflow: Workflow): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCyclesDFS = (nodeId: string): boolean => {
    // If node is already in recursion stack, we found a cycle
    if (recursionStack.has(nodeId)) return true;

    // If node was already visited and not in the recursion stack, no cycle here
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = workflow.edges.filter(
      (edge) => edge.source === nodeId
    );

    for (const edge of outgoingEdges) {
      if (hasCyclesDFS(edge.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  // Check each node as a potential starting point
  for (const node of workflow.nodes) {
    if (!visited.has(node.id) && hasCyclesDFS(node.id)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates that all nodes have the correct type
 */
export function validateNodeTypes(nodes: readonly ReactFlowNode[]): boolean {
  return nodes.every((node) => node.type === "workflowNode");
}

/**
 * Validates that all edges have the correct type
 */
export function validateEdgeTypes(edges: readonly ReactFlowEdge[]): boolean {
  return edges.every((edge) => edge.type === "workflowEdge");
}
