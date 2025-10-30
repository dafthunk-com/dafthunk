import type { Edge as ReactFlowEdge } from "@xyflow/react";
import { createContext, ReactNode, useContext } from "react";

import {
  WorkflowEdgeType,
  WorkflowNodeType,
  WorkflowParameter,
} from "./workflow-types";

type UpdateNodeFn = (nodeId: string, data: Partial<WorkflowNodeType>) => void;
type UpdateEdgeFn = (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
type DeleteEdgeFn = (edgeId: string) => void;

export interface WorkflowContextProps {
  updateNodeData?: UpdateNodeFn;
  updateEdgeData?: UpdateEdgeFn;
  deleteEdge?: DeleteEdgeFn;
  edges?: ReactFlowEdge<WorkflowEdgeType>[];
  disabled?: boolean;
  expandedOutputs?: boolean;
}

// Create the context with a default value
const WorkflowContext = createContext<WorkflowContextProps>({
  updateNodeData: () => {},
  updateEdgeData: () => {},
  deleteEdge: () => {},
  edges: [],
  disabled: false,
});

// Custom hook for using the workflow context
export const useWorkflow = () => useContext(WorkflowContext);

export interface WorkflowProviderProps {
  readonly children: ReactNode;
  readonly updateNodeData?: UpdateNodeFn;
  readonly updateEdgeData?: UpdateEdgeFn;
  readonly deleteEdge?: DeleteEdgeFn;
  readonly edges?: ReactFlowEdge<WorkflowEdgeType>[];
  readonly disabled?: boolean;
  readonly expandedOutputs?: boolean;
}

export function WorkflowProvider({
  children,
  updateNodeData = () => {},
  updateEdgeData = () => {},
  deleteEdge = () => {},
  edges = [],
  disabled = false,
  expandedOutputs = false,
}: WorkflowProviderProps) {
  const workflowContextValue = {
    updateNodeData,
    updateEdgeData,
    deleteEdge,
    edges,
    disabled,
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
  updateNodeData?: UpdateNodeFn,
  edges?: ReactFlowEdge<WorkflowEdgeType>[],
  deleteEdge?: DeleteEdgeFn
): readonly WorkflowParameter[] => {
  const updatedInputs = inputs.map((input) =>
    input.id === inputId ? { ...input, value } : input
  );

  // Delete any edges connected to this input when manually setting a value
  if (edges && deleteEdge) {
    const connectedEdges = edges.filter(
      (edge) => edge.target === nodeId && edge.targetHandle === inputId
    );
    connectedEdges.forEach((edge) => deleteEdge(edge.id));
  }

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
