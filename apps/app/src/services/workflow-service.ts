import {
  CancelWorkflowExecutionResponse,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  DeleteWorkflowResponse,
  Edge,
  ExecuteWorkflowRequest,
  ExecuteWorkflowResponse,
  GetEmailTriggerResponse,
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
import useSWR, { type SWRConfiguration } from "swr";

import { useAuth } from "@/components/auth-context";
import type { EmailData } from "@/components/workflow/execution-email-dialog";
import type { HttpRequestConfig } from "@/components/workflow/http-request-config-dialog";
import {
  NodeType,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";

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
export const useWorkflow = (
  id: string | null,
  options?: SWRConfiguration<WorkflowWithMetadata>
) => {
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
      : null,
    options
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
 * Get a workflow by ID
 */
export const getWorkflow = async (
  id: string,
  orgHandle: string
): Promise<WorkflowWithMetadata> => {
  return await makeOrgRequest<GetWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`
  );
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
export function useWorkflowExecution(
  orgHandle: string,
  wsExecuteFn?: (options?: { parameters?: Record<string, unknown> }) => void
) {
  const [isEmailFormDialogVisible, setIsEmailFormDialogVisible] =
    useState(false);
  const [
    isHttpRequestConfigDialogVisible,
    setIsHttpRequestConfigDialogVisible,
  ] = useState(false);
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

      const requestOptions: RequestInit = {
        method: "POST",
      };

      // Extract special parameters from request parameters
      const params = request?.parameters;
      let headers: Record<string, string> = {};
      let queryParams: Record<string, string> = {};
      let body: BodyInit | undefined;

      if (params) {
        // Extract headers if provided
        if (params.headers && typeof params.headers === "object") {
          headers = params.headers;
        }

        // Extract query params if provided
        if (params.queryParams && typeof params.queryParams === "object") {
          queryParams = params.queryParams;
        }

        // Handle body
        if (params.body) {
          if (params.body instanceof FormData) {
            body = params.body;
            // FormData will automatically set the correct multipart/form-data header
          } else if (params.body instanceof File) {
            body = params.body;
            headers["Content-Type"] =
              params.body.type || "application/octet-stream";
          } else if (typeof params.body === "object") {
            body = JSON.stringify(params.body);
            headers["Content-Type"] = "application/json";
          } else if (typeof params.body === "string") {
            body = params.body;
            // Use contentType if provided, otherwise default to text/plain
            headers["Content-Type"] =
              (params.contentType as string) || "text/plain";
          }
        }

        // Use method from params if provided (e.g., from HttpRequestConfigDialog)
        if (params.method && typeof params.method === "string") {
          requestOptions.method = params.method;
        }
      }

      // Build URL with query parameters
      let urlPath = `/${id}/execute/dev`;
      if (Object.keys(queryParams).length > 0) {
        const searchParams = new URLSearchParams(queryParams);
        urlPath += `?${searchParams.toString()}`;
      }

      if (body) {
        requestOptions.body = body;
      }

      // Use makeOrgRequest with custom headers
      const response = await makeOrgRequest<ExecuteWorkflowResponse>(
        orgHandle,
        API_ENDPOINT_BASE,
        urlPath,
        {
          ...requestOptions,
          headers,
        }
      );

      return {
        ...response,
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

      if (wsExecuteFn) {
        try {
          wsExecuteFn({
            parameters: request?.parameters,
          });
        } catch (error) {
          console.error("WebSocket execution failed:", error);
          onExecutionUpdate({
            id: "",
            workflowId: id,
            status: "error",
            nodeExecutions: [],
            error:
              error instanceof Error
                ? error.message
                : "WebSocket execution failed",
          });
        }
        return cancelCurrentExecution;
      }

      executeAndPollWorkflow(id, request)
        .then((initialExecution: WorkflowExecution) => {
          if (pollingRef.current.cancelled) return;

          pollingRef.current.currentExecutionId = initialExecution.id;
          pollingRef.current.currentWorkflowId = id;

          onExecutionUpdate(initialExecution);

          if (
            initialExecution.status === "completed" ||
            initialExecution.status === "error" ||
            initialExecution.status === "cancelled" ||
            initialExecution.status === "exhausted"
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
                execution.status === "cancelled" ||
                execution.status === "exhausted"
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
            error: error instanceof Error ? error.message : "Failed to execute",
          });
        });

      return cancelCurrentExecution;
    },
    [
      wsExecuteFn,
      executeAndPollWorkflow,
      cancelCurrentExecution,
      orgHandle,
      cleanup,
    ]
  );

  const executeWorkflowWithForm = useCallback(
    (
      id: string,
      onExecution: (execution: WorkflowExecution) => void,
      _uiNodes: ReactFlowNode<WorkflowNodeType>[],
      _nodeTypesData: NodeType[] | undefined,
      workflowTypeString?: string
    ) => {
      cleanup();

      const lowercasedWorkflowType = workflowTypeString?.toLowerCase();

      // Check for email workflow type first
      if (lowercasedWorkflowType === "email_message") {
        setIsEmailFormDialogVisible(true);
        setExecutionContext({
          id,
          onExecution,
          workflowType: workflowTypeString,
        });
        return;
      }

      // Then check for HTTP workflow type - show new HTTP request config dialog
      if (
        lowercasedWorkflowType === "http_webhook" ||
        lowercasedWorkflowType === "http_request"
      ) {
        // Show the new HTTP request config dialog for all HTTP workflows
        setIsHttpRequestConfigDialogVisible(true);
        setExecutionContext({
          id,
          onExecution,
          workflowType: workflowTypeString,
        });
        return;
      }

      // If no specific dialog conditions met for 'email' or 'http' (with params),
      // or if it's another workflow type, execute directly.
      performExecutionAndPoll(id, onExecution);
    },
    [performExecutionAndPoll, cleanup]
  );

  const submitEmailFormData = useCallback(
    (emailData: EmailData) => {
      if (!executionContext) return;

      const { id, onExecution } = executionContext;
      // Send email parameters at top level for WebSocket path
      // The HTTP path will receive these via JSON body parsing
      const parameters = {
        from: emailData.from,
        subject: emailData.subject,
        body: emailData.body,
        attachments: emailData.attachments,
      };
      performExecutionAndPoll(id, onExecution, { parameters });
      setIsEmailFormDialogVisible(false);
      setExecutionContext(null);
    },
    [executionContext, performExecutionAndPoll]
  );

  const submitHttpRequestConfig = useCallback(
    (config: HttpRequestConfig) => {
      if (!executionContext) return;

      const { id, onExecution } = executionContext;

      // Build parameters from HTTP config
      const parameters: Record<string, any> = {
        method: config.method,
      };

      // Add headers if any
      if (config.headers && Object.keys(config.headers).length > 0) {
        parameters.headers = config.headers;
      }

      // Add query params if any
      if (config.queryParams && Object.keys(config.queryParams).length > 0) {
        parameters.queryParams = config.queryParams;
      }

      // Add body and content type for POST requests
      if (config.method === "POST" && config.body) {
        parameters.body = config.body;
        parameters.contentType = config.contentType;
      }

      performExecutionAndPoll(id, onExecution, { parameters });
      setIsHttpRequestConfigDialogVisible(false);
      setExecutionContext(null);
    },
    [executionContext, performExecutionAndPoll]
  );

  const closeExecutionForm = useCallback(() => {
    setIsEmailFormDialogVisible(false);
    setIsHttpRequestConfigDialogVisible(false);
    setExecutionContext(null);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    executeWorkflow: executeWorkflowWithForm,
    cancelWorkflowExecution,
    isEmailFormDialogVisible,
    isHttpRequestConfigDialogVisible,
    submitEmailFormData,
    submitHttpRequestConfig,
    closeExecutionForm,
  };
}

/**
 * Hook to get an email trigger for a specific workflow
 */
export const useEmailTrigger = (
  workflowId: string | null,
  options?: SWRConfiguration<GetEmailTriggerResponse | null>
) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;
  const { data, error, isLoading, mutate } =
    useSWR<GetEmailTriggerResponse | null>(
      orgHandle && workflowId
        ? `/${orgHandle}${API_ENDPOINT_BASE}/${workflowId}/email-trigger`
        : null,
      orgHandle && workflowId
        ? async () => {
            try {
              const response = await makeOrgRequest<GetEmailTriggerResponse>(
                orgHandle,
                API_ENDPOINT_BASE,
                `/${workflowId}/email-trigger`
              );
              return response;
            } catch (error) {
              if (
                error instanceof Error &&
                "status" in error &&
                (error as any).status === 404
              ) {
                return null;
              }
              throw error;
            }
          }
        : null,
      options
    );

  return {
    emailTrigger: data || null,
    emailTriggerError: error || null,
    isEmailTriggerLoading: isLoading,
    mutateEmailTrigger: mutate,
  };
};
