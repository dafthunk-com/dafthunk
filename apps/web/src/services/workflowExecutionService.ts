import {
  NodeExecutionState,
  WorkflowNodeData,
  WorkflowEdgeData,
} from "@/components/workflow/workflow-types.tsx";

type GenericNode = {
  id: string;
  data: WorkflowNodeData;
  [key: string]: unknown;
};

type GenericEdge = {
  id: string;
  data?: WorkflowEdgeData;
  source: string;
  target: string;
  [key: string]: unknown;
};

export const workflowExecutionService = {
  stripExecutionFields(data: WorkflowNodeData): Omit<WorkflowNodeData, 'executionState' | 'error'> & {
    outputs: Omit<WorkflowNodeData['outputs'][number], 'value' | 'isConnected'>[];
    inputs: Omit<WorkflowNodeData['inputs'][number], 'isConnected'>[];
  } {
    const { executionState, error, ...rest } = data;

    return {
      ...rest,
      outputs: data.outputs.map(
        ({ value, isConnected, ...outputRest }) => outputRest
      ),
      inputs: data.inputs.map(({ isConnected, ...inputRest }) => inputRest),
    };
  },

  stripEdgeExecutionFields(data: WorkflowEdgeData = {}): Omit<WorkflowEdgeData, 'isActive'> {
    const { isActive, ...rest } = data;
    return rest;
  },

  updateNodesWithExecutionState(
    nodes: readonly GenericNode[],
    nodeId: string,
    state: NodeExecutionState
  ): readonly GenericNode[] {
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

  updateEdgesForNodeExecution(
    edges: readonly GenericEdge[],
    _nodeId: string,
    state: NodeExecutionState,
    connectedEdgeIds: readonly string[]
  ): readonly GenericEdge[] {
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
    } 
    
    if (state === "completed" || state === "error") {
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

  updateNodesWithExecutionOutputs(
    nodes: readonly GenericNode[],
    nodeId: string,
    outputs: Record<string, unknown>
  ): readonly GenericNode[] {
    return nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              outputs: node.data.outputs.map((output) => ({
                ...output,
                value: outputs[output.id],
              })),
            },
          }
        : node
    );
  },

  updateNodesWithExecutionError(
    nodes: readonly GenericNode[],
    nodeId: string,
    error: string | undefined
  ): readonly GenericNode[] {
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
