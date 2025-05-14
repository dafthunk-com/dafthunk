import useSWR, { mutate } from "swr";
import {
  WorkflowExecution,
  ListExecutionsRequest,
  ListExecutionsResponse,
  GetExecutionResponse,
  PublicExecutionWithStructure,
  GetPublicExecutionResponse,
  UpdateExecutionVisibilityResponse,
} from "@dafthunk/types";
import { apiRequest } from "@/utils/api";
import { useAuth } from "@/components/authContext";
import { makeOrgRequest } from "./utils";
import { useInfinatePagination } from "@/hooks/use-infinate-pagination";
import { useCallback, useState, useRef, useEffect } from "react";
import type { Node } from "@xyflow/react";
import type {
  WorkflowExecutionStatus,
  WorkflowExecution as FrontendWorkflowExecution,
  NodeExecutionState,
  WorkflowNodeType,
  NodeTemplate,
} from "@/components/workflow/workflow-types.tsx";
import type { DialogFormParameter } from "@/components/workflow/execution-form-dialog";
import { extractDialogParametersFromNodes } from "@/utils/utils";

// Base endpoint for executions
const API_ENDPOINT_BASE = "/executions";

// Default page size for pagination
export const EXECUTIONS_PAGE_SIZE = 20;

// Re-export PublicExecutionWithStructure to maintain compatibility
export type { PublicExecutionWithStructure } from "@dafthunk/types";

//-----------------------------------------------------------------------
// Workflow Executor Hook Types
//-----------------------------------------------------------------------

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
    onExecution: (execution: FrontendWorkflowExecution) => void,
    uiNodes: Node<WorkflowNodeType>[],
    nodeTemplates: NodeTemplate[]
  ) => (() => void) | undefined;
  isExecutionFormVisible: boolean;
  executionFormParameters: DialogFormParameter[];
  submitExecutionForm: (formData: Record<string, any>) => void;
  closeExecutionForm: () => void;
}

//-----------------------------------------------------------------------
// Hook Return Types
//-----------------------------------------------------------------------

interface UseExecutions {
  executions: WorkflowExecution[];
  executionsError: Error | null;
  isExecutionsLoading: boolean;
  mutateExecutions: () => Promise<any>;
}

interface UsePaginatedExecutions {
  paginatedExecutions: WorkflowExecution[];
  executionsError: Error | null;
  isExecutionsInitialLoading: boolean;
  isExecutionsLoadingMore: boolean;
  mutateExecutions: () => Promise<any>;
  isExecutionsReachingEnd: boolean;
  executionsObserverTargetRef: React.RefObject<HTMLDivElement | null>;
}

interface UseExecution {
  execution: WorkflowExecution | null;
  executionError: Error | null;
  isExecutionLoading: boolean;
  mutateExecution: () => Promise<any>;
}

interface UsePublicExecution {
  publicExecution: PublicExecutionWithStructure | null;
  publicExecutionError: Error | null;
  isPublicExecutionLoading: boolean;
  mutatePublicExecution: () => Promise<any>;
}

//-----------------------------------------------------------------------
// Hooks
//-----------------------------------------------------------------------

/**
 * Custom hook to manage workflow execution, including parameter forms and status polling.
 * Uses the provided execution functions to handle workflow execution and status polling.
 */
export function useWorkflowExecutor(
  options: UseWorkflowExecutorOptions
): UseWorkflowExecutorReturn {
  const [isExecutionFormVisible, setIsExecutionFormVisible] = useState(false);
  const [formParameters, setFormParameters] = useState<DialogFormParameter[]>(
    []
  );

  const executionContextRef = useRef<{
    id: string;
    onExecution: (execution: FrontendWorkflowExecution) => void;
    jsonBodyNode?: Node<WorkflowNodeType>;
  } | null>(null);

  const activeExecutionCleanupRef = useRef<(() => void) | null>(null);

  const performExecutionAndPoll = useCallback(
    (
      id: string,
      onExecutionUpdate: (execution: FrontendWorkflowExecution) => void,
      requestBody?: Record<string, any>
    ): (() => void) => {
      console.log(`Starting execution for ID: ${id} with body:`, requestBody);

      let pollingIntervalId: NodeJS.Timeout | undefined = undefined;
      let cancelled = false;

      const cleanup = () => {
        cancelled = true;
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
        }
        console.log(`Client-side polling cleanup called for ID: ${id}.`);
        activeExecutionCleanupRef.current = null;
      };
      activeExecutionCleanupRef.current = cleanup;

      // Use the provided execute function
      options
        .executeWorkflowFn(id, requestBody)
        .then((initialExecution: WorkflowExecution) => {
          if (cancelled) return;
          const executionId = initialExecution.id;

          const updateExecutionState = (exec: WorkflowExecution) => {
            onExecutionUpdate({
              status: exec.status as WorkflowExecutionStatus,
              nodeExecutions: exec.nodeExecutions.map((ne) => ({
                nodeId: ne.nodeId,
                status: ne.status as NodeExecutionState,
                outputs: ne.outputs || {},
                error: ne.error,
              })),
            });
          };

          updateExecutionState(initialExecution);

          if (
            initialExecution.status === "completed" ||
            initialExecution.status === "error"
          ) {
            if (activeExecutionCleanupRef.current)
              activeExecutionCleanupRef.current();
            return;
          }

          pollingIntervalId = setInterval(async () => {
            if (cancelled) {
              clearInterval(pollingIntervalId);
              return;
            }

            try {
              // Need to handle the organization when using getExecution
              // For our service, we need both executionId and orgHandle
              // If getExecutionFn is provided, assume it will handle org context internally
              let execution: WorkflowExecution;

              if (options.getExecutionFn) {
                execution = await options.getExecutionFn(executionId);
              } else {
                // For our fallback, we need to get org handle
                // This is sub-optimal but will be handled better in the editor component
                console.warn(
                  "Using fallback getExecution without org context - this may fail"
                );
                execution = await (getExecution as any)(executionId);
              }

              if (cancelled) {
                clearInterval(pollingIntervalId);
                return;
              }

              updateExecutionState(execution);

              if (
                execution.status === "completed" ||
                execution.status === "error"
              ) {
                clearInterval(pollingIntervalId);
                if (activeExecutionCleanupRef.current)
                  activeExecutionCleanupRef.current();
              }
            } catch (error) {
              console.error("Error polling execution status:", error);
              clearInterval(pollingIntervalId);
              onExecutionUpdate({
                status: "error",
                nodeExecutions: [],
                error:
                  error instanceof Error ? error.message : "Polling failed",
              });
              if (activeExecutionCleanupRef.current)
                activeExecutionCleanupRef.current();
            }
          }, 1000);
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("Error starting or processing execution:", error);
          onExecutionUpdate({
            status: "error",
            nodeExecutions: [],
            error: error instanceof Error ? error.message : "Failed to execute",
          });
          if (activeExecutionCleanupRef.current)
            activeExecutionCleanupRef.current();
        });

      return cleanup;
    },
    [options]
  );

  const executeWorkflow = useCallback(
    (
      id: string,
      onExecution: (execution: FrontendWorkflowExecution) => void,
      uiNodes: Node<WorkflowNodeType>[],
      nodeTemplatesData: NodeTemplate[] | undefined
    ): (() => void) | undefined => {
      if (activeExecutionCleanupRef.current) {
        activeExecutionCleanupRef.current();
      }

      if (!nodeTemplatesData) {
        console.error(
          "Node templates are not available. Cannot determine execution parameters."
        );
        onExecution({
          status: "error",
          nodeExecutions: [],
          error: "Node templates not loaded, cannot prepare execution.",
        });
        return undefined;
      }

      // Check for body.json nodes
      const jsonBodyNode = uiNodes.find(
        (node) => node.data.nodeType === "body.json"
      );

      // Check if JSON body is required
      const isJsonBodyRequired = jsonBodyNode
        ? ((jsonBodyNode.data.inputs.find((input) => input.id === "required")
            ?.value ?? true) as boolean)
        : false;

      // Extract all parameters (including body.json)
      const httpParameterNodes = extractDialogParametersFromNodes(
        uiNodes,
        nodeTemplatesData
      );

      if (httpParameterNodes.length > 0) {
        // If we have parameters, show the form
        setFormParameters(httpParameterNodes);
        setIsExecutionFormVisible(true);
        executionContextRef.current = {
          id,
          onExecution,
          // Store the JSON body node if it exists
          jsonBodyNode: jsonBodyNode,
        };
        return undefined;
      } else if (jsonBodyNode) {
        // No form parameters but we have a JSON body node

        // Always include a non-empty JSON object when JSON body is required
        // This avoids the "JSON body is required but not provided" error
        const defaultJsonBody = isJsonBodyRequired ? { data: {} } : {};

        return performExecutionAndPoll(id, onExecution, defaultJsonBody);
      } else {
        // No parameters at all
        return performExecutionAndPoll(id, onExecution);
      }
    },
    [performExecutionAndPoll]
  );

  const submitExecutionForm = useCallback(
    (formData: Record<string, any>) => {
      setIsExecutionFormVisible(false);
      if (executionContextRef.current) {
        const { id, onExecution, jsonBodyNode } = executionContextRef.current;

        // Check if we have a JSON body parameter
        const hasJsonBodyParam = jsonBodyNode && "requestBody" in formData;

        if (hasJsonBodyParam) {
          // Extract the JSON body from the form data
          const jsonBody = formData.requestBody;

          // Remove the special field so we only keep regular form parameters
          const { requestBody, ...regularFormData } = formData;

          // If we have a valid JSON body, use it as the request body
          // Otherwise, use the regular form data
          if (jsonBody && typeof jsonBody === "object") {
            // Use the JSON itself as the request body
            performExecutionAndPoll(id, onExecution, jsonBody);
          } else if (Object.keys(regularFormData).length > 0) {
            // Fall back to form data if we have other parameters
            performExecutionAndPoll(id, onExecution, regularFormData);
          } else {
            // If the JSON body is required but no valid JSON was provided,
            // use an empty object to avoid "JSON body is required but not provided" errors
            const isJsonBodyRequired = (jsonBodyNode.data.inputs.find(
              (input) => input.id === "required"
            )?.value ?? true) as boolean;

            const defaultBody = isJsonBodyRequired ? { data: {} } : {};
            performExecutionAndPoll(id, onExecution, defaultBody);
          }
        } else {
          // No JSON body parameter, use form data as usual
          performExecutionAndPoll(id, onExecution, formData);
        }
      }
      executionContextRef.current = null;
    },
    [performExecutionAndPoll]
  );

  const closeExecutionForm = useCallback(() => {
    setIsExecutionFormVisible(false);
    executionContextRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (activeExecutionCleanupRef.current) {
        console.log(
          "Cleaning up active execution from useWorkflowExecutor unmount/effect."
        );
        activeExecutionCleanupRef.current();
      }
    };
  }, []);

  return {
    executeWorkflow,
    isExecutionFormVisible,
    executionFormParameters: formParameters,
    submitExecutionForm,
    closeExecutionForm,
  };
}

/**
 * Hook to list executions with optional filtering
 */
export const useExecutions = (
  params?: Partial<ListExecutionsRequest>
): UseExecutions => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (params?.workflowId) queryParams.append("workflowId", params.workflowId);
  if (params?.deploymentId)
    queryParams.append("deploymentId", params.deploymentId);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const queryString = queryParams.toString();
  const path = queryString ? `?${queryString}` : "";

  // Create a unique SWR key that includes the organization handle and query params
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}${path}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListExecutionsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            path
          );
          return response.executions;
        }
      : null
  );

  return {
    executions: data || [],
    executionsError: error || null,
    isExecutionsLoading: isLoading,
    mutateExecutions: mutate,
  };
};

/**
 * Hook to use paginated executions with infinite scroll
 */
export const usePaginatedExecutions = (
  workflowId?: string,
  deploymentId?: string
): UsePaginatedExecutions => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const getKey = (
    pageIndex: number,
    previousPageData: WorkflowExecution[] | null
  ) => {
    if (
      previousPageData &&
      (!previousPageData.length ||
        previousPageData.length < EXECUTIONS_PAGE_SIZE)
    ) {
      return null; // Reached the end
    }

    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.append("offset", String(pageIndex * EXECUTIONS_PAGE_SIZE));
    queryParams.append("limit", String(EXECUTIONS_PAGE_SIZE));

    if (workflowId) queryParams.append("workflowId", workflowId);
    if (deploymentId) queryParams.append("deploymentId", deploymentId);

    const queryString = queryParams.toString();
    return orgHandle
      ? `/${orgHandle}${API_ENDPOINT_BASE}?${queryString}`
      : null;
  };

  const fetcher = async (url: string): Promise<WorkflowExecution[]> => {
    if (!orgHandle) return [];

    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname.replace(`/${orgHandle}`, "");
    const query = urlObj.search;

    const response = await makeOrgRequest<ListExecutionsResponse>(
      orgHandle,
      path,
      query
    );

    return response.executions;
  };

  const {
    paginatedData,
    error,
    isInitialLoading,
    isLoadingMore,
    mutate,
    isReachingEnd,
    observerTargetRef,
  } = useInfinatePagination<WorkflowExecution>(getKey, fetcher, {
    pageSize: EXECUTIONS_PAGE_SIZE,
    revalidateFirstPage: true,
    revalidateOnMount: true,
    refreshInterval: 5000, // Regular refresh to see execution status updates
  });

  return {
    paginatedExecutions: paginatedData,
    executionsError: error,
    isExecutionsInitialLoading: isInitialLoading,
    isExecutionsLoadingMore: isLoadingMore,
    mutateExecutions: mutate,
    isExecutionsReachingEnd: isReachingEnd,
    executionsObserverTargetRef: observerTargetRef,
  };
};

/**
 * Hook to get execution details for an execution ID
 */
export const useExecution = (executionId: string | null): UseExecution => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey =
    orgHandle && executionId
      ? `/${orgHandle}${API_ENDPOINT_BASE}/${executionId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey
      ? async () => {
          const response = await makeOrgRequest<GetExecutionResponse>(
            orgHandle!,
            API_ENDPOINT_BASE,
            `/${executionId}`
          );
          return response.execution;
        }
      : null
  );

  return {
    execution: data || null,
    executionError: error || null,
    isExecutionLoading: isLoading,
    mutateExecution: mutate,
  };
};

/**
 * Hook to get public execution details
 */
export const usePublicExecution = (
  executionId: string | null
): UsePublicExecution => {
  const { data, error, isLoading, mutate } = useSWR(
    executionId ? `${API_ENDPOINT_BASE}/public/${executionId}` : null,
    executionId
      ? async () => {
          const response = await apiRequest<GetPublicExecutionResponse>(
            `${API_ENDPOINT_BASE}/public/${executionId}`
          );
          return response.execution;
        }
      : null
  );

  return {
    publicExecution: data || null,
    publicExecutionError: error || null,
    isPublicExecutionLoading: isLoading,
    mutatePublicExecution: mutate,
  };
};

/**
 * Get a list of executions
 */
export const getExecutions = async (params: {
  offset: number;
  limit: number;
  workflowId?: string;
  deploymentId?: string;
  orgHandle: string;
}): Promise<WorkflowExecution[]> => {
  const { offset, limit, workflowId, deploymentId, orgHandle } = params;

  const queryParams = new URLSearchParams();
  queryParams.append("offset", offset.toString());
  queryParams.append("limit", limit.toString());
  if (workflowId) queryParams.append("workflowId", workflowId);
  if (deploymentId) queryParams.append("deploymentId", deploymentId);

  const path = `?${queryParams.toString()}`;

  const response = await makeOrgRequest<ListExecutionsResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    path
  );

  return response.executions;
};

/**
 * Get a single execution by ID
 */
export const getExecution = async (
  executionId: string,
  orgHandle: string
): Promise<WorkflowExecution> => {
  const response = await makeOrgRequest<GetExecutionResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${executionId}`
  );

  return response.execution;
};

/**
 * Get a public execution by ID
 */
export const getPublicExecution = async (
  executionId: string
): Promise<PublicExecutionWithStructure> => {
  const response = await apiRequest<GetPublicExecutionResponse>(
    `${API_ENDPOINT_BASE}/public/${executionId}`
  );

  return response.execution;
};

/**
 * Set an execution's visibility to public
 */
export const setExecutionPublic = async (
  executionId: string,
  orgHandle: string
): Promise<boolean> => {
  const response = await makeOrgRequest<UpdateExecutionVisibilityResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${executionId}/share/public`,
    {
      method: "PATCH",
    }
  );

  // Invalidate all execution related queries
  await mutate(
    (key) => typeof key === "string" && key.includes(API_ENDPOINT_BASE)
  );

  return response.success;
};

/**
 * Set an execution's visibility to private
 */
export const setExecutionPrivate = async (
  executionId: string,
  orgHandle: string
): Promise<boolean> => {
  const response = await makeOrgRequest<UpdateExecutionVisibilityResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${executionId}/share/private`,
    {
      method: "PATCH",
    }
  );

  // Invalidate all execution related queries
  await mutate(
    (key) => typeof key === "string" && key.includes(API_ENDPOINT_BASE)
  );

  return response.success;
};

// Compatibility exports to match the interface expected by consumers
export const useExecutionDetails = useExecution;
export const usePublicExecutionDetails = usePublicExecution;
