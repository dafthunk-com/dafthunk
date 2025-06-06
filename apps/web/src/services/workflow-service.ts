import {
  CancelWorkflowExecutionResponse,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  DeleteWorkflowResponse,
  Edge,
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
  GetCronTriggerResponse,
  GetWorkflowResponse,
  ListWorkflowsResponse,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  UpsertCronTriggerResponse,
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
import type { EmailData } from "@/components/workflow/execution-email-dialog";
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
  const [isEmailFormDialogVisible, setIsEmailFormDialogVisible] =
    useState(false);
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
    workflowType?: string;
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
      nodeTemplatesData: NodeTemplate[] | undefined,
      workflowTypeString?: string
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

      const lowercasedWorkflowType = workflowTypeString?.toLowerCase();
      console.log(
        "[WorkflowService] executeWorkflowWithForm received workflowTypeString:",
        workflowTypeString,
        "Lowercased:",
        lowercasedWorkflowType
      );

      // Check for email workflow type first
      if (lowercasedWorkflowType === "email_message") {
        setIsEmailFormDialogVisible(true);
        setExecutionContext({
          id,
          onExecution,
          workflowType: workflowTypeString,
        });
        return undefined;
      }

      // Then check for HTTP workflow type for other dialogs
      if (lowercasedWorkflowType === "http_request") {
        const jsonBodyNode = uiNodes.find(
          (node) => node.data.nodeType === "body-json"
        );
        const httpParameterNodes = extractDialogParametersFromNodes(
          uiNodes,
          nodeTemplatesData
        );
        console.log(
          "[WorkflowService] HTTP_REQUEST block. jsonBodyNode:",
          jsonBodyNode,
          "httpParameterNodes:",
          httpParameterNodes
        );

        // Handle JSON body node if present for HTTP workflows
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
          setExecutionContext({
            id,
            onExecution,
            workflowType: workflowTypeString,
          });
          return undefined;
        }

        // Handle form parameters if present for HTTP workflows
        if (httpParameterNodes.length > 0) {
          setFormParameters(httpParameterNodes);
          setIsFormDialogVisible(true);
          setExecutionContext({
            id,
            onExecution,
            workflowType: workflowTypeString,
          });
          return undefined;
        }
      }

      // If no specific dialog conditions met for 'email' or 'http' (with params),
      // or if it's another workflow type, execute directly.
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

  const submitEmailFormData = useCallback(
    (emailData: EmailData) => {
      if (!executionContext) return;

      const { id, onExecution } = executionContext;
      // Construct the parameters as expected by the backend for an email trigger
      // This might involve a specific structure, e.g., an "email" object
      // For now, let's assume it takes these parameters directly, or nested under an "email" key.
      // Adjust this based on how the backend expects to receive email trigger data.
      const parameters = {
        // Example: could be flat, or nested like { email: emailData }
        // Based on typical HTTP triggers, they might be expected as top-level form data or a JSON body.
        // If it's like a webhook, it might be JSON.
        // Let's assume for now the backend expects these as direct parameters.
        from: emailData.from,
        subject: emailData.subject,
        body: emailData.body,
      };
      performExecutionAndPoll(id, onExecution, { parameters });
      setIsEmailFormDialogVisible(false);
      setExecutionContext(null);
    },
    [executionContext, performExecutionAndPoll]
  );

  const closeExecutionForm = useCallback(() => {
    setIsFormDialogVisible(false);
    setIsJsonBodyDialogVisible(false);
    setIsEmailFormDialogVisible(false);
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
    isEmailFormDialogVisible,
    executionFormParameters: formParameters,
    executionJsonBodyParameters: jsonBodyParameters,
    submitFormData,
    submitJsonBody,
    submitEmailFormData,
    closeExecutionForm,
  };
}

/**
 * Get cron trigger for a specific workflow
 */
export const getCronTrigger = async (
  workflowId: string,
  orgHandle: string
): Promise<GetCronTriggerResponse | null> => {
  try {
    const response = await makeOrgRequest<GetCronTriggerResponse>(
      orgHandle,
      API_ENDPOINT_BASE,
      `/${workflowId}/cron`,
      { method: "GET" }
    );
    return response;
  } catch (error: any) {
    if (error.message?.includes("404")) {
      // Or a more specific error check if API returns structured errors
      return null; // Not found is a valid state, not an error for this function
    }
    console.error("Error fetching cron trigger:", error);
    throw error; // Re-throw other errors
  }
};

/**
 * Create or update a cron trigger for a workflow
 */
export const upsertCronTrigger = async (
  workflowId: string,
  orgHandle: string,
  data: {
    cronExpression: string;
    versionAlias: "dev" | "latest" | "version";
    versionNumber?: number | null;
    active: boolean;
  }
): Promise<UpsertCronTriggerResponse> => {
  return await makeOrgRequest<UpsertCronTriggerResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${workflowId}/cron`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
};
