import { useCallback } from "react";
import { ExecutionEvent, ExecutionState } from "@/lib/workflowTypes";

interface UseWorkflowExecutionProps {
  workflowId: string;
  updateNodeExecutionState: (nodeId: string, state: ExecutionState) => void;
}

export function useWorkflowExecution({
  workflowId,
  updateNodeExecutionState,
}: UseWorkflowExecutionProps) {
  const handleExecute = useCallback(() => {
    const eventSource = new EventSource(`/workflows/${workflowId}/execute`);

    eventSource.onopen = () => {
      console.log("Execution started");
    };

    eventSource.onerror = (error) => {
      console.error("Execution error:", error);
      eventSource.close();
    };

    eventSource.addEventListener("node-start", (event) => {
      const data = JSON.parse(event.data) as ExecutionEvent;
      console.log("Node execution started:", data);
      if (data.type === "node-start") {
        updateNodeExecutionState(data.nodeId, "executing");
      }
    });

    eventSource.addEventListener("node-complete", (event) => {
      const data = JSON.parse(event.data) as ExecutionEvent;
      console.log("Node execution completed:", data);
      if (data.type === "node-complete") {
        updateNodeExecutionState(data.nodeId, "completed");
      }
    });

    eventSource.addEventListener("node-error", (event) => {
      const data = JSON.parse(event.data) as ExecutionEvent;
      console.error("Node execution error:", data);
      if (data.type === "node-error") {
        updateNodeExecutionState(data.nodeId, "error");
      }
    });

    eventSource.addEventListener("execution-complete", (event) => {
      const data = JSON.parse(event.data) as ExecutionEvent;
      console.log("Workflow execution completed:", data);
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [workflowId, updateNodeExecutionState]);

  return {
    handleExecute,
  };
}
