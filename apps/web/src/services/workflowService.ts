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
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import { useAuth } from "@/components/auth-context";
import { makeOrgRequest } from "./utils";
import {
  Edge as ReactFlowEdge,
  Connection,
  Node as ReactFlowNode,
} from "@xyflow/react";
import {
  WorkflowNodeType,
  NodeTemplate,
} from "@/components/workflow/workflow-types";
import { useState, useRef, useCallback, useEffect } from "react";
import type { DialogFormParameter } from "@/components/workflow/execution-form-dialog";
import { extractDialogParametersFromNodes } from "@/utils/utils";
import { getExecution } from "./executionService";

// Base endpoint for workflows
const API_ENDPOINT_BASE = "/workflows";

/**
 * Type representing a connection validation result
 */
export type ConnectionValidationResult =
  | { status: "valid" }
  | { status: "invalid"; reason: string };

/**
 * @interface UseWorkflowExecutorOptions
 * @property executeWorkflowFn - Function that executes the workflow and returns the initial execution
 */
export interface UseWorkflowExecutorOptions {
  executeWorkflowFn: (
    id: string,
    parameters?: Record<string, any>
  ) => Promise<WorkflowExecution>;
  getExecutionFn?: (executionId: string) => Promise<WorkflowExecution>;
}

/**
 * @interface UseWorkflowExecutorReturn
 * @property executeWorkflow - Function to initiate a workflow execution. It handles showing a parameter form if needed.
 *   Takes workflowId, onExecution callback, current UI nodes, and node templates.
 *   Returns a cleanup function for the polling mechanism, or undefined if a form is shown.
 * @property isExecutionFormVisible - Boolean indicating if the execution parameter form should be visible.
 * @property executionFormParameters - Array of parameters to be displayed in the execution form.
 * @property submitExecutionForm - Callback to submit the execution form with user-provided data.
 * @property closeExecutionForm - Callback to close the execution form.
 */
export interface UseWorkflowExecutorReturn {
  executeWorkflow: (
    id: string,
    onExecution: (execution: WorkflowExecution) => void,
    uiNodes: ReactFlowNode<WorkflowNodeType>[],
    nodeTemplates: NodeTemplate[]
  ) => (() => void) | undefined;
  isExecutionFormVisible: boolean;
  executionFormParameters: DialogFormParameter[];
  submitExecutionForm: (formData: Record<string, any>) => void;
  closeExecutionForm: () => void;
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

/**
 * Helper function to handle JSON body parameters
 */
function handleJsonBodyParameters(
  jsonBodyNode: ReactFlowNode<WorkflowNodeType> | undefined,
  formData: Record<string, any>
): Record<string, any> {
  if (!jsonBodyNode || !("requestBody" in formData)) {
    return formData;
  }

  const jsonBody = formData.requestBody;
  const { requestBody, ...regularFormData } = formData;
  const isJsonBodyRequired = (jsonBodyNode.data.inputs.find(
    (input) => input.id === "required"
  )?.value ?? true) as boolean;

  if (jsonBody && typeof jsonBody === "object") {
    return jsonBody;
  }

  if (Object.keys(regularFormData).length > 0) {
    return regularFormData;
  }

  return isJsonBodyRequired ? { data: {} } : {};
}

/**
 * Hook to manage workflow execution, including parameter forms and status polling.
 */
export function useWorkflowExecution(orgHandle: string) {
  const [isExecutionFormVisible, setIsExecutionFormVisible] = useState(false);
  const [formParameters, setFormParameters] = useState<DialogFormParameter[]>(
    []
  );
  const [executionContext, setExecutionContext] = useState<{
    id: string;
    onExecution: (execution: WorkflowExecution) => void;
    jsonBodyNode?: ReactFlowNode<WorkflowNodeType>;
  } | null>(null);

  const pollingRef = useRef<{
    intervalId?: NodeJS.Timeout;
    cancelled: boolean;
  }>({ cancelled: false });

  const cleanup = useCallback(() => {
    if (pollingRef.current.intervalId) {
      clearInterval(pollingRef.current.intervalId);
    }
    pollingRef.current.cancelled = true;
    pollingRef.current.intervalId = undefined;
  }, []);

  const executeWorkflow = useCallback(
    async (id: string, parameters?: Record<string, any>) => {
      if (!orgHandle) {
        throw new Error("Organization handle is required");
      }

      // Execute the workflow in development mode
      const response = await makeOrgRequest<ExecuteWorkflowResponse>(
        orgHandle,
        API_ENDPOINT_BASE,
        `/${id}/execute/dev?monitorProgress=true`,
        {
          method: "POST",
          ...(parameters && { body: JSON.stringify(parameters) }),
        }
      );

      // Transform ExecuteWorkflowResponse to WorkflowExecution by adding missing fields
      return {
        ...response,
        visibility: "private" as "private" | "public",
      };
    },
    [orgHandle]
  );

  const performExecutionAndPoll = useCallback(
    (
      id: string,
      onExecutionUpdate: (execution: WorkflowExecution) => void,
      requestBody?: Record<string, any>
    ): (() => void) => {
      cleanup();
      pollingRef.current.cancelled = false;

      executeWorkflow(id, requestBody)
        .then((initialExecution: WorkflowExecution) => {
          if (pollingRef.current.cancelled) return;
          onExecutionUpdate(initialExecution);

          if (
            initialExecution.status === "completed" ||
            initialExecution.status === "error"
          ) {
            cleanup();
            return;
          }

          pollingRef.current.intervalId = setInterval(async () => {
            if (pollingRef.current.cancelled) return;

            try {
              const execution = await getExecution(
                initialExecution.id,
                orgHandle
              );

              if (pollingRef.current.cancelled) return;
              onExecutionUpdate(execution);

              if (
                execution.status === "completed" ||
                execution.status === "error"
              ) {
                cleanup();
              }
            } catch (error) {
              console.error("Error polling execution status:", error);
              cleanup();
              onExecutionUpdate({
                id: initialExecution.id,
                workflowId: id,
                status: "error",
                nodeExecutions: [],
                visibility: "private",
                error:
                  error instanceof Error ? error.message : "Polling failed",
              });
            }
          }, 1000);
        })
        .catch((error) => {
          if (pollingRef.current.cancelled) return;
          cleanup();
          onExecutionUpdate({
            id: "",
            workflowId: id,
            status: "error",
            nodeExecutions: [],
            visibility: "private",
            error: error instanceof Error ? error.message : "Failed to execute",
          });
        });

      return cleanup;
    },
    [executeWorkflow, cleanup, orgHandle]
  );

  const executeWorkflowWithForm = useCallback(
    (
      id: string,
      onExecution: (execution: WorkflowExecution) => void,
      uiNodes: ReactFlowNode<WorkflowNodeType>[],
      nodeTemplatesData: NodeTemplate[] | undefined
    ): (() => void) | undefined => {
      cleanup();

      if (!nodeTemplatesData) {
        onExecution({
          id: "",
          workflowId: id,
          status: "error",
          nodeExecutions: [],
          visibility: "private",
          error: "Node templates not loaded, cannot prepare execution.",
        });
        return undefined;
      }

      const jsonBodyNode = uiNodes.find(
        (node) => node.data.nodeType === "body.json"
      );
      const httpParameterNodes = extractDialogParametersFromNodes(
        uiNodes,
        nodeTemplatesData
      );

      if (httpParameterNodes.length > 0) {
        setFormParameters(httpParameterNodes);
        setIsExecutionFormVisible(true);
        setExecutionContext({ id, onExecution, jsonBodyNode });
        return undefined;
      }

      const isJsonBodyRequired = jsonBodyNode
        ? ((jsonBodyNode.data.inputs.find((input) => input.id === "required")
            ?.value ?? true) as boolean)
        : false;

      const defaultJsonBody = isJsonBodyRequired ? { data: {} } : {};
      return performExecutionAndPoll(id, onExecution, defaultJsonBody);
    },
    [performExecutionAndPoll, cleanup]
  );

  const submitExecutionForm = useCallback(
    (formData: Record<string, any>) => {
      setIsExecutionFormVisible(false);
      if (executionContext) {
        const { id, onExecution, jsonBodyNode } = executionContext;
        const requestBody = handleJsonBodyParameters(jsonBodyNode, formData);
        performExecutionAndPoll(id, onExecution, requestBody);
      }
      setExecutionContext(null);
    },
    [executionContext, performExecutionAndPoll]
  );

  const closeExecutionForm = useCallback(() => {
    setIsExecutionFormVisible(false);
    setExecutionContext(null);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    executeWorkflow: executeWorkflowWithForm,
    isExecutionFormVisible,
    executionFormParameters: formParameters,
    submitExecutionForm,
    closeExecutionForm,
  };
}
