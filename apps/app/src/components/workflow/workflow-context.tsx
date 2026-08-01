import type { WorkflowTrigger } from "@dafthunk/types";
import type { Edge as ReactFlowEdge } from "@xyflow/react";
import { createContext, ReactNode, useContext, useMemo } from "react";

import {
  NodeType,
  WorkflowEdgeType,
  WorkflowNodeType,
  WorkflowParameter,
} from "./workflow-types";

type UpdateNodeFn = (nodeId: string, data: Partial<WorkflowNodeType>) => void;

// Extends UpdateNodeFn with functional updater support (like React's setState)
type UpdateNodeDataFn = (
  nodeId: string,
  data:
    | Partial<WorkflowNodeType>
    | ((current: WorkflowNodeType) => Partial<WorkflowNodeType>)
) => void;
type UpdateEdgeFn = (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
type DeleteEdgeFn = (edgeId: string) => void;

export interface WorkflowContextProps {
  updateNodeData?: UpdateNodeDataFn;
  updateEdgeData?: UpdateEdgeFn;
  deleteEdge?: DeleteEdgeFn;
  edges?: ReactFlowEdge<WorkflowEdgeType>[];
  disabled?: boolean;
  expandedOutputs?: boolean;
  nodeTypes?: NodeType[];
  workflowTrigger?: WorkflowTrigger;
}

// Create the context with a default value
const WorkflowContext = createContext<WorkflowContextProps>({
  updateNodeData: () => {},
  updateEdgeData: () => {},
  deleteEdge: () => {},
  edges: [],
  disabled: false,
  nodeTypes: [],
});

// Custom hook for using the workflow context
export const useWorkflow = () => useContext(WorkflowContext);

export interface WorkflowProviderProps {
  readonly children: ReactNode;
  readonly updateNodeData?: UpdateNodeDataFn;
  readonly updateEdgeData?: UpdateEdgeFn;
  readonly deleteEdge?: DeleteEdgeFn;
  readonly edges?: ReactFlowEdge<WorkflowEdgeType>[];
  readonly disabled?: boolean;
  readonly expandedOutputs?: boolean;
  readonly nodeTypes?: NodeType[];
  readonly workflowTrigger?: WorkflowTrigger;
}

export function WorkflowProvider({
  children,
  updateNodeData = () => {},
  updateEdgeData = () => {},
  deleteEdge = () => {},
  edges = [],
  disabled = false,
  expandedOutputs = false,
  nodeTypes = [],
  workflowTrigger,
}: WorkflowProviderProps) {
  // Every node and every field consumes this context, so an unmemoized value
  // object would re-render the whole canvas on each builder render.
  const workflowContextValue = useMemo(
    () => ({
      updateNodeData,
      updateEdgeData,
      deleteEdge,
      edges,
      disabled,
      expandedOutputs,
      nodeTypes,
      workflowTrigger,
    }),
    [
      updateNodeData,
      updateEdgeData,
      deleteEdge,
      edges,
      disabled,
      expandedOutputs,
      nodeTypes,
      workflowTrigger,
    ]
  );

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
    input.id === inputId ? ({ ...input, value } as WorkflowParameter) : input
  );

  // Setting a value by hand replaces whatever was feeding the input, so drop
  // its connections. Inputs can be wired from either end (see the reversed
  // branch in `isValidConnection`), so both directions have to be checked —
  // matching only on `target` left reversed edges attached to an input that
  // now has a literal value.
  if (edges && deleteEdge) {
    const connectedEdges = edges.filter(
      (edge) =>
        (edge.target === nodeId && edge.targetHandle === inputId) ||
        (edge.source === nodeId && edge.sourceHandle === inputId)
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
    input.id === inputId
      ? ({ ...input, value: undefined } as WorkflowParameter)
      : input
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
