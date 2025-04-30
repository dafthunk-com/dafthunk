import { createContext, useContext, ReactNode } from "react";
import { 
  WorkflowNodeData, 
  WorkflowEdgeData, 
  WorkflowParameter 
} from "./workflow-types";

export interface WorkflowContextProps {
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
}

// Create the context with a default value
const WorkflowContext = createContext<WorkflowContextProps>({
  updateNodeData: () => {},
  updateEdgeData: () => {},
});

// Custom hook for using the workflow context
export const useWorkflow = () => useContext(WorkflowContext);

export interface WorkflowProviderProps {
  readonly children: ReactNode;
  readonly updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  readonly updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
}

export function WorkflowProvider({
  children,
  updateNodeData,
  updateEdgeData,
}: WorkflowProviderProps) {
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
export const convertValueByType = (value: string, type: string): string | number | boolean | undefined => {
  if (type === "number") {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }
  if (type === "boolean") {
    return value.toLowerCase() === "true";
  }
  return value;
};

export const updateNodeInput = (
  nodeId: string,
  inputId: string,
  value: unknown,
  inputs: readonly WorkflowParameter[],
  updateNodeData: WorkflowContextProps["updateNodeData"]
): WorkflowParameter[] => {
  const updatedInputs = inputs.map((input) => 
    input.id === inputId ? { ...input, value } : input
  );

  updateNodeData(nodeId, { inputs: updatedInputs });
  return updatedInputs;
};

export const clearNodeInput = (
  nodeId: string,
  inputId: string,
  inputs: readonly WorkflowParameter[],
  updateNodeData: WorkflowContextProps["updateNodeData"]
): WorkflowParameter[] => {
  const updatedInputs = inputs.map((input) => 
    input.id === inputId ? { ...input, value: undefined } : input
  );

  updateNodeData(nodeId, { inputs: updatedInputs });
  return updatedInputs;
};

export const updateNodeName = (
  nodeId: string,
  name: string,
  updateNodeData: WorkflowContextProps["updateNodeData"]
): void => {
  updateNodeData(nodeId, { name });
};
