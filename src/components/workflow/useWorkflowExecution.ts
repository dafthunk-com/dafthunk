import { useCallback } from "react";
import { NodeExecutionState } from "./workflow-node";

export type ExecutionEventType = 
  | "node-start" 
  | "node-complete" 
  | "node-error" 
  | "execution-complete" 
  | "execution-error";

export interface ExecutionEvent {
  type: ExecutionEventType;
  nodeId?: string;
  error?: string;
  outputs?: Record<string, any>;
}

export interface UseWorkflowExecutionProps {
  workflowId: string;
  updateNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
  onExecutionStart?: () => void;
  onExecutionComplete?: () => void;
  onExecutionError?: (error: string) => void;
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, outputs?: Record<string, any>) => void;
  onNodeError?: (nodeId: string, error: string) => void;
  executeWorkflow?: (workflowId: string, callbacks: {
    onEvent: (event: ExecutionEvent) => void;
    onComplete: () => void;
    onError: (error: string) => void;
  }) => void | (() => void);
}

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
      console.warn("No executeWorkflow function provided, simulating execution");
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