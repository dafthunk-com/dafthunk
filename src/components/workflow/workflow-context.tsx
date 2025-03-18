import { createContext, useContext, ReactNode } from "react";
import { Parameter } from "./workflow-node";

export interface WorkflowContextProps {
  updateNodeData: (nodeId: string, data: any) => void;
  updateEdgeData: (edgeId: string, data: any) => void;
  deleteNode: (nodeId: string) => void;
}

// Create the context with a default value
const WorkflowContext = createContext<WorkflowContextProps>({
  updateNodeData: () => {},
  updateEdgeData: () => {},
  deleteNode: () => {},
});

// Custom hook for using the workflow context
export function useWorkflow() {
  return useContext(WorkflowContext);
}

export interface WorkflowProviderProps {
  children: ReactNode;
  updateNodeData: (nodeId: string, data: any) => void;
  updateEdgeData: (edgeId: string, data: any) => void;
  deleteNode?: (nodeId: string) => void;
}

export function WorkflowProvider({
  children,
  updateNodeData,
  updateEdgeData,
  deleteNode = () => {},
}: WorkflowProviderProps) {
  // Create the context value
  const workflowContextValue = {
    updateNodeData,
    updateEdgeData,
    deleteNode,
  };

  return (
    <WorkflowContext.Provider value={workflowContextValue}>
      {children}
    </WorkflowContext.Provider>
  );
}

// Helper functions for common node updates
export const convertValueByType = (value: string, type: string) => {
  if (type === "number") {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }
  if (type === "boolean") {
    return value.toLowerCase() === "true";
  }
  return value; // Default to string
};

export const updateNodeInput = (
  nodeId: string,
  inputId: string,
  value: any,
  inputs: Parameter[],
  updateNodeData: WorkflowContextProps["updateNodeData"]
) => {
  const updatedInputs = inputs.map((input) => {
    if (input.id === inputId) {
      return { ...input, value };
    }
    return input;
  });

  updateNodeData(nodeId, { inputs: updatedInputs });
  return updatedInputs;
};

export const clearNodeInput = (
  nodeId: string,
  inputId: string,
  inputs: Parameter[],
  updateNodeData: WorkflowContextProps["updateNodeData"]
) => {
  const updatedInputs = inputs.map((input) => {
    if (input.id === inputId) {
      return { ...input, value: undefined };
    }
    return input;
  });

  updateNodeData(nodeId, { inputs: updatedInputs });
  return updatedInputs;
};

export const updateNodeLabel = (
  nodeId: string,
  label: string,
  updateNodeData: WorkflowContextProps["updateNodeData"]
) => {
  updateNodeData(nodeId, { label });
};
