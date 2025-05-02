import {
  NodeExecutionState,
  WorkflowNodeType,
  WorkflowEdgeType,
} from "@/components/workflow/workflow-types.tsx";
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from "@xyflow/react";

export const workflowExecutionService = {
  stripExecutionFields(data: WorkflowNodeType): Omit<
    WorkflowNodeType,
    "executionState" | "error"
  > & {
    outputs: Omit<
      WorkflowNodeType["outputs"][number],
      "value" | "isConnected"
    >[];
    inputs: Omit<WorkflowNodeType["inputs"][number], "isConnected">[];
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

  stripEdgeExecutionFields(
    data: WorkflowEdgeType = {}
  ): Omit<WorkflowEdgeType, "isActive"> {
    const { isActive, ...rest } = data;
    return rest;
  },

  updateNodesWithExecutionState(
    nodes: readonly ReactFlowNode<WorkflowNodeType>[],
    nodeId: string,
    state: NodeExecutionState
  ): readonly ReactFlowNode<WorkflowNodeType>[] {
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
    edges: readonly ReactFlowEdge<WorkflowEdgeType>[],
    _nodeId: string,
    state: NodeExecutionState,
    connectedEdgeIds: readonly string[]
  ): readonly ReactFlowEdge<WorkflowEdgeType>[] {
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
    nodes: readonly ReactFlowNode<WorkflowNodeType>[],
    nodeId: string,
    outputs: Record<string, unknown>
  ): readonly ReactFlowNode<WorkflowNodeType>[] {
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
    nodes: readonly ReactFlowNode<WorkflowNodeType>[],
    nodeId: string,
    error: string | undefined
  ): readonly ReactFlowNode<WorkflowNodeType>[] {
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
