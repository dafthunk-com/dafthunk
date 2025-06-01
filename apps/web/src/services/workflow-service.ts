import {
  CancelWorkflowExecutionResponse,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  DeleteWorkflowResponse,
  Edge,
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
  GetWorkflowResponse,
  ListWorkflowsResponse,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  WorkflowExecution,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import {
  Connection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";
import type { DialogFormParameter } from "@/components/workflow/execution-form-dialog";
import type { JsonBodyParameter } from "@/components/workflow/execution-json-body-dialog";
import {
  NodeTemplate,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import { extractDialogParametersFromNodes } from "@/utils/utils";

import { getExecution } from "./execution-service";
import { makeOrgRequest } from "./utils";

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
 * Converts workflow edges to ReactFlow compatible edges
 */
export const convertToReactFlowEdges = (
  edges: readonly Edge[]
): readonly ReactFlowEdge[] => {
  return edges.map((edge) => ({
    id: `e-${edge.source}-${edge.sourceOutput}-${edge.target}-${edge.targetInput}`,
    type: "workflowEdge",
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceOutput,
    targetHandle: edge.targetInput,
  }));
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
 * Hook to manage workflow execution, including parameter forms and status polling.
 */
export function useWorkflowExecution(orgHandle: string) {
  const [isFormDialogVisible, setIsFormDialogVisible] = useState(false);
  const [isJsonBodyDialogVisible, setIsJsonBodyDialogVisible] = useState(false);
  const [formParameters, setFormParameters] = useState<DialogFormParameter[]>(
    []
  );
  const [jsonBodyParameters, setJsonBodyParameters] = useState<
    JsonBodyParameter[]
  >([]);
  const [executionContext, setExecutionContext] = useState<{
    id: string;
    onExecution: (execution: WorkflowExecution) => void;
    pendingFormData?: Record<string, any>;
  } | null>(null);

  const pollingRef = useRef<{
    intervalId?: NodeJS.Timeout;
    cancelled: boolean;
    currentExecutionId?: string;
    currentWorkflowId?: string;
  }>({ cancelled: false });

  const cleanup = useCallback(() => {
    if (pollingRef.current.intervalId) {
      clearInterval(pollingRef.current.intervalId);
    }
    pollingRef.current.cancelled = true;
    pollingRef.current.intervalId = undefined;
    pollingRef.current.currentExecutionId = undefined;
    pollingRef.current.currentWorkflowId = undefined;
  }, []);

  const executeAndPollWorkflow = useCallback(
    async (
      id: string,
      request?: ExecuteWorkflowRequest
    ): Promise<WorkflowExecution> => {
      if (!orgHandle) {
        throw new Error("Organization handle is required");
      }

      // Execute the workflow in development mode
      const response = await makeOrgRequest<ExecuteWorkflowResponse>(
        orgHandle,
        API_ENDPOINT_BASE,
        `/${id}/execute/dev?monitorProgress=${request?.monitorProgress ?? true}`,
        {
          method: "POST",
          ...(request?.parameters &&
            Object.keys(request.parameters).length > 0 && {
              body: (() => {
                // If we have a jsonBody parameter, send it directly as JSON
                if (request.parameters.jsonBody) {
                  return JSON.stringify(request.parameters.jsonBody);
                }
                // Otherwise use FormData for regular form parameters
                const formData = new FormData();
                Object.entries(request.parameters).forEach(([key, value]) => {
                  if (value !== undefined && value !== null) {
                    // Convert value to string based on its type
                    let stringValue: string;
                    if (typeof value === "boolean") {
                      stringValue = value ? "true" : "false";
                    } else if (typeof value === "number") {
                      stringValue = value.toString();
                    } else if (typeof value === "object") {
                      stringValue = JSON.stringify(value);
                    } else {
                      stringValue = String(value);
                    }
                    formData.append(key, stringValue);
                  }
                });
                return formData;
              })(),
            }),
        }
      );

      return {
        ...response,
        visibility: "private" as "private" | "public",
      };
    },
    [orgHandle]
  );

  const cancelWorkflowExecution = useCallback(
    async (
      workflowId: string,
      executionId: string
    ): Promise<CancelWorkflowExecutionResponse> => {
      if (!orgHandle) {
        throw new Error("Organization handle is required");
      }

      const response = await makeOrgRequest<CancelWorkflowExecutionResponse>(
        orgHandle,
        API_ENDPOINT_BASE,
        `/${workflowId}/executions/${executionId}/cancel`,
        {
          method: "POST",
        }
      );

      return response;
    },
    [orgHandle]
  );

  const cancelCurrentExecution = useCallback(async () => {
    // Save execution IDs before cleanup clears them
    const executionId = pollingRef.current.currentExecutionId;
    const workflowId = pollingRef.current.currentWorkflowId;

    // Stop polling first
    cleanup();

    // If we have a current execution, try to cancel it on the server
    if (executionId && workflowId) {
      try {
        await cancelWorkflowExecution(workflowId, executionId);
      } catch (error) {
        console.error("Error cancelling workflow execution:", error);
        // Don't throw - we still want to clean up locally
      }
    } else {
      console.warn(
        "No execution to cancel - execution ID or workflow ID not found"
      );
    }
  }, [cleanup, cancelWorkflowExecution]);

  const performExecutionAndPoll = useCallback(
    (
      id: string,
      onExecutionUpdate: (execution: WorkflowExecution) => void,
      request?: ExecuteWorkflowRequest
    ): (() => void) => {
      cleanup();
      pollingRef.current.cancelled = false;

      executeAndPollWorkflow(id, { monitorProgress: true, ...request })
        .then((initialExecution: WorkflowExecution) => {
          if (pollingRef.current.cancelled) return;

          // Track the current execution
          pollingRef.current.currentExecutionId = initialExecution.id;
          pollingRef.current.currentWorkflowId = id;

          onExecutionUpdate(initialExecution);

          if (
            initialExecution.status === "completed" ||
            initialExecution.status === "error" ||
            initialExecution.status === "cancelled"
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
                execution.status === "error" ||
                execution.status === "cancelled"
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

      return cancelCurrentExecution;
    },
    [executeAndPollWorkflow, cancelCurrentExecution, orgHandle]
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
        (node) => node.data.nodeType === "body-json"
      );
      const httpParameterNodes = extractDialogParametersFromNodes(
        uiNodes,
        nodeTemplatesData
      );

      // Handle JSON body node if present
      if (jsonBodyNode) {
        setJsonBodyParameters([
          {
            nodeId: jsonBodyNode.id,
            nameForForm: "jsonBody",
            label: "JSON Body",
            nodeName: jsonBodyNode.data.name,
            isRequired: (jsonBodyNode.data.inputs.find(
              (input) => input.id === "required"
            )?.value ?? true) as boolean,
          },
        ]);
        setIsJsonBodyDialogVisible(true);
        setExecutionContext({ id, onExecution });
        return undefined;
      }

      // Handle form parameters if present
      if (httpParameterNodes.length > 0) {
        setFormParameters(httpParameterNodes);
        setIsFormDialogVisible(true);
        setExecutionContext({ id, onExecution });
        return undefined;
      }

      // If no parameters needed, execute directly
      return performExecutionAndPoll(id, onExecution);
    },
    [performExecutionAndPoll, cleanup]
  );

  const submitFormData = useCallback(
    (formData: Record<string, any>) => {
      if (!executionContext) return;

      const { id, onExecution } = executionContext;
      performExecutionAndPoll(id, onExecution, { parameters: formData });
      setIsFormDialogVisible(false);
      setExecutionContext(null);
    },
    [executionContext, performExecutionAndPoll]
  );

  const submitJsonBody = useCallback(
    (jsonData: Record<string, any>) => {
      if (!executionContext) return;

      const { id, onExecution } = executionContext;
      performExecutionAndPoll(id, onExecution, {
        parameters: { jsonBody: jsonData.jsonBody },
      });
      setIsJsonBodyDialogVisible(false);
      setExecutionContext(null);
    },
    [executionContext, performExecutionAndPoll]
  );

  const closeExecutionForm = useCallback(() => {
    setIsFormDialogVisible(false);
    setIsJsonBodyDialogVisible(false);
    setExecutionContext(null);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    executeWorkflow: executeWorkflowWithForm,
    cancelWorkflowExecution,
    isFormDialogVisible,
    isJsonBodyDialogVisible,
    executionFormParameters: formParameters,
    executionJsonBodyParameters: jsonBodyParameters,
    submitFormData,
    submitJsonBody,
    closeExecutionForm,
  };
}
