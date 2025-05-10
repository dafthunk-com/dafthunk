import { createContext, useContext, ReactNode } from "react";
import {
  WorkflowNodeType,
  WorkflowEdgeType,
  WorkflowParameter,
} from "./workflow-types";

type UpdateNodeFn = (nodeId: string, data: Partial<WorkflowNodeType>) => void;
type UpdateEdgeFn = (edgeId: string, data: Partial<WorkflowEdgeType>) => void;

export interface WorkflowContextProps {
  updateNodeData?: UpdateNodeFn;
  updateEdgeData?: UpdateEdgeFn;
  readonly?: boolean;
  expandedOutputs?: boolean;
}

// Create the context with a default value
const WorkflowContext = createContext<WorkflowContextProps>({
  updateNodeData: () => {},
  updateEdgeData: () => {},
  readonly: false,
});

// Custom hook for using the workflow context
export const useWorkflow = () => useContext(WorkflowContext);

export interface WorkflowProviderProps {
  readonly children: ReactNode;
  readonly updateNodeData?: UpdateNodeFn;
  readonly updateEdgeData?: UpdateEdgeFn;
  readonly readonly?: boolean;
  readonly expandedOutputs?: boolean;
}

export function WorkflowProvider({
  children,
  updateNodeData = () => {},
  updateEdgeData = () => {},
  readonly = false,
  expandedOutputs = false,
}: WorkflowProviderProps) {
  const workflowContextValue = {
    updateNodeData,
    updateEdgeData,
    readonly,
    expandedOutputs,
  };

  return (
    <WorkflowContext.Provider value={workflowContextValue}>
      {children}
    </WorkflowContext.Provider>
  );
}

// Helper functions for common node updates
export const convertValueByType = (
  value: string,
  type: string
): string | number | boolean | undefined => {
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
  updateNodeData?: UpdateNodeFn
): readonly WorkflowParameter[] => {
  const updatedInputs = inputs.map((input) =>
    input.id === inputId ? { ...input, value } : input
  );

  updateNodeData?.(nodeId, { inputs: updatedInputs });
  return updatedInputs;
};

export const clearNodeInput = (
  nodeId: string,
  inputId: string,
  inputs: readonly WorkflowParameter[],
  updateNodeData?: UpdateNodeFn
): readonly WorkflowParameter[] => {
  const updatedInputs = inputs.map((input) =>
    input.id === inputId ? { ...input, value: undefined } : input
  );

  updateNodeData?.(nodeId, { inputs: updatedInputs });
  return updatedInputs;
};

export const updateNodeName = (
  nodeId: string,
  name: string,
  updateNodeData?: UpdateNodeFn
): void => {
  updateNodeData?.(nodeId, { name });
};
