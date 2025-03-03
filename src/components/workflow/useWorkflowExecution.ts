import { useCallback } from "react";
import { ExecutionEvent, UseWorkflowExecutionProps } from "./workflow-types";

export function useWorkflowExecution({
  workflowId,
  updateNodeExecutionState,
  onExecutionStart,
  onExecutionComplete,
  onExecutionError,
  onNodeStart,
  onNodeComplete,
  onNodeError,
  executeWorkflow,
}: UseWorkflowExecutionProps) {
  const handleExecute = useCallback(() => {
    // Call the execution start callback
    onExecutionStart?.();

    // If no custom execution function is provided, we just simulate the execution
    if (!executeWorkflow) {
      console.warn(
        "No executeWorkflow function provided, simulating execution"
      );
      return;
    }

    // Handle events from the execution
    const handleEvent = (event: ExecutionEvent) => {
      switch (event.type) {
        case "node-start":
          if (event.nodeId) {
            updateNodeExecutionState(event.nodeId, "executing");
            onNodeStart?.(event.nodeId);
          }
          break;
        case "node-complete":
          if (event.nodeId) {
            updateNodeExecutionState(event.nodeId, "completed");

            // If we have outputs, update the node's output values
            if (event.outputs && Object.keys(event.outputs).length > 0) {
              console.log(
                `Updating node ${event.nodeId} outputs:`,
                event.outputs
              );
            }

            onNodeComplete?.(event.nodeId, event.outputs);
          }
          break;
        case "node-error":
          if (event.nodeId && event.error) {
            updateNodeExecutionState(event.nodeId, "error");
            onNodeError?.(event.nodeId, event.error);
          }
          break;
        case "execution-complete":
          onExecutionComplete?.();
          break;
        case "execution-error":
          if (event.error) {
            onExecutionError?.(event.error);
          }
          break;
      }
    };

    // Execute the workflow
    const cleanup = executeWorkflow(workflowId, {
      onEvent: handleEvent,
      onComplete: () => {
        onExecutionComplete?.();
      },
      onError: (error) => {
        onExecutionError?.(error);
      },
    });

    // Return cleanup function if provided
    return cleanup;
  }, [
    workflowId,
    updateNodeExecutionState,
    onExecutionStart,
    onExecutionComplete,
    onExecutionError,
    onNodeStart,
    onNodeComplete,
    onNodeError,
    executeWorkflow,
  ]);

  return {
    handleExecute,
  };
}
