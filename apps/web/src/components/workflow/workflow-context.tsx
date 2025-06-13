import { createContext, ReactNode, useContext } from "react";

import {
  WorkflowEdgeType,
  WorkflowNodeType,
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

export const updateMultipleNodeNames = (
  nodeIds: string[],
  nameTemplate: string,
  updateNodeData?: UpdateNodeFn
): void => {
  if (!updateNodeData || nodeIds.length === 0) return;

  nodeIds.forEach((nodeId, index) => {
    // If template contains {index}, replace it with the current index (1-based)
    // If template contains {index0}, replace it with 0-based index
    // Otherwise, just use the template as-is for single nodes, or append number for multiple
    let finalName = nameTemplate;

    if (nameTemplate.includes("{index}")) {
      finalName = nameTemplate.replace(/\{index\}/g, (index + 1).toString());
    } else if (nameTemplate.includes("{index0}")) {
      finalName = nameTemplate.replace(/\{index0\}/g, index.toString());
    } else if (nodeIds.length > 1) {
      // For multiple nodes without index template, append number
      finalName = `${nameTemplate} ${index + 1}`;
    }

    updateNodeData(nodeId, { name: finalName });
  });
};
