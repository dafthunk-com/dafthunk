import { createContext, useContext, ReactNode } from "react";
import { Parameter } from "./workflow-node";

export interface WorkflowContextProps {
  updateNodeData: (nodeId: string, data: any) => void;
  updateEdgeData: (edgeId: string, data: any) => void;
}

export const WorkflowContext = createContext<WorkflowContextProps | undefined>(
  undefined
);

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return context;
}

export interface WorkflowProviderProps {
  children: ReactNode;
  updateNodeData: (nodeId: string, data: any) => void;
  updateEdgeData: (edgeId: string, data: any) => void;
}

export function WorkflowProvider({
  children,
  updateNodeData,
  updateEdgeData,
}: WorkflowProviderProps) {
  // Create the context value
  const workflowContextValue = {
    updateNodeData,
    updateEdgeData,
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
