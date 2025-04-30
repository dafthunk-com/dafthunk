import {
  NodeExecutionState,
  WorkflowNodeData,
  WorkflowEdgeData,
} from "@/components/workflow/workflow-types.tsx";

// Generic edge type to avoid ReactFlow dependency
interface GenericEdge {
  id: string;
  data?: WorkflowEdgeData;
  source: string;
  target: string;
}

export const workflowExecutionService = {
  // Moved from useWorkflowState
  stripExecutionFields(data: WorkflowNodeData) {
    const { executionState, error, ...rest } = data;

    return {
      ...rest,
      outputs: data.outputs.map(
        ({ value, isConnected, ...outputRest }) => outputRest
      ),
      inputs: data.inputs.map(({ isConnected, ...inputRest }) => inputRest),
    };
  },

  // Moved from useWorkflowState
  stripEdgeExecutionFields(data: WorkflowEdgeData = {}) {
    const { isActive, ...rest } = data;
    return rest;
  },

  // Moved from useWorkflowState
  updateNodesWithExecutionState(
    nodes: any[],
    nodeId: string,
    state: NodeExecutionState
  ) {
    return nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              executionState: state,
              error: state === "error" ? node.data.error : null,
            },
          }
        : node
    );
  },

  // Moved from useWorkflowState, now using generic edge type
  updateEdgesForNodeExecution(
    edges: GenericEdge[],
    _nodeId: string,
    state: NodeExecutionState,
    connectedEdgeIds: string[]
  ) {
    if (state === "executing") {
      return edges.map((edge) => {
        const isConnectedToExecutingNode = connectedEdgeIds.includes(edge.id);
        return {
          ...edge,
          data: {
            ...(edge.data || {}),
            isActive: isConnectedToExecutingNode,
          },
        };
      });
    } else if (state === "completed" || state === "error") {
      return edges.map((edge) => ({
        ...edge,
        data: {
          ...(edge.data || {}),
          isActive: false,
        },
      }));
    }
    return edges;
  },

  // Moved from useWorkflowState
  updateNodesWithExecutionOutputs(
    nodes: any[],
    nodeId: string,
    outputs: Record<string, any>
  ) {
    return nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              outputs: node.data.outputs.map((output: any) => ({
                ...output,
                value: outputs[output.id],
              })),
            },
          }
        : node
    );
  },

  // Moved from useWorkflowState
  updateNodesWithExecutionError(
    nodes: any[],
    nodeId: string,
    error: string | undefined
  ) {
    return nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              error,
            },
          }
        : node
    );
  },
};
