import { useCallback, useState, useRef, useEffect } from "react";
import type { Node } from "@xyflow/react";
import type { WorkflowExecution as BackendWorkflowExecution } from "@dafthunk/types";
import type {
  WorkflowExecutionStatus,
  WorkflowExecution,
  NodeExecutionState,
  WorkflowNodeType,
  NodeTemplate,
} from "@/components/workflow/workflow-types.tsx";
import type { DialogFormParameter } from "@/components/workflow/execution-form-dialog";
import { API_BASE_URL } from "@/config/api";
import { extractDialogParametersFromNodes } from "@/utils/utils";

/**
 * @interface UseWorkflowExecutorOptions
 * @property executeUrlFn - Required function that provides the execution URL.
 *   This ensures explicit URL construction for all execution types.
 */
export interface UseWorkflowExecutorOptions {
  executeUrlFn: (id: string) => string;
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
    uiNodes: Node<WorkflowNodeType>[],
    nodeTemplates: NodeTemplate[]
  ) => (() => void) | undefined;
  isExecutionFormVisible: boolean;
  executionFormParameters: DialogFormParameter[];
  submitExecutionForm: (formData: Record<string, any>) => void;
  closeExecutionForm: () => void;
}

/**
 * Custom hook to manage workflow execution, including parameter forms and status polling.
 * Can be used for both workflow executions and deployment executions by providing the appropriate
 * execution URL function.
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
    onExecution: (execution: WorkflowExecution) => void;
    jsonBodyNode?: Node<WorkflowNodeType>;
  } | null>(null);

  const activeExecutionCleanupRef = useRef<(() => void) | null>(null);

  const performExecutionAndPoll = useCallback(
    (
      id: string,
      onExecutionUpdate: (execution: WorkflowExecution) => void,
      requestBody?: Record<string, any>
    ): (() => void) => {
      console.log(`Starting execution for ID: ${id} with body:`, requestBody);

      const requestOptions: RequestInit = {
        method: "POST",
        credentials: "include",
      };

      if (requestBody && Object.keys(requestBody).length > 0) {
        requestOptions.headers = { "Content-Type": "application/json" };
        requestOptions.body = JSON.stringify(requestBody);
      }

      // Use the provided URL function to generate the execution endpoint
      const executeUrl = new URL(options.executeUrlFn(id));
      executeUrl.searchParams.append("monitorProgress", "true");

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

      fetch(executeUrl.toString(), requestOptions)
        .then(async (response) => {
          if (cancelled) return;
          if (!response.ok) {
            let errorMessage = `Failed to start execution. Status: ${response.status}`;
            try {
              const errData = await response.json();
              errorMessage = errData.message || errorMessage;
            } catch (_jsonError) {
              // Ignore JSON parsing errors for error messages
            }
            throw new Error(errorMessage);
          }
          return response.json();
        })
        .then(async (initialExecution: BackendWorkflowExecution) => {
          if (cancelled) return;
          const executionId = initialExecution.id;

          const updateExecutionState = (exec: BackendWorkflowExecution) => {
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
              const statusResponse = await fetch(
                `${API_BASE_URL}/executions/${executionId}`,
                { credentials: "include" }
              );
              if (cancelled) {
                clearInterval(pollingIntervalId);
                return;
              }
              if (statusResponse.status === 404) {
                console.warn(
                  `Execution ${executionId} not found during polling. Stopping poll.`
                );
                clearInterval(pollingIntervalId);
                if (activeExecutionCleanupRef.current)
                  activeExecutionCleanupRef.current();
                return;
              }
              if (!statusResponse.ok) {
                let errorMessage = `Failed to fetch execution status. Status: ${statusResponse.status}`;
                try {
                  const errorData = await statusResponse.json();
                  errorMessage = errorData.message || errorMessage;
                } catch (_jsonError) {
                  // Ignore JSON parsing errors for error messages
                }
                throw new Error(errorMessage);
              }
              const execution =
                (await statusResponse.json()) as BackendWorkflowExecution;
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
      onExecution: (execution: WorkflowExecution) => void,
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
