import { Node, Workflow, NodeExecution } from "@dafthunk/types";
import { NodeExecutionState, WorkflowNodeData, WorkflowEdgeData } from "@/components/workflow/workflow-types.tsx";

// Generic edge type to avoid ReactFlow dependency
interface GenericEdge {
  id: string;
  data?: WorkflowEdgeData;
  source: string;
  target: string;
}

export const workflowExecutionService = {
  async executeNode(node: Node): Promise<NodeExecution> {
    try {
      // This is a placeholder for actual node execution logic
      // In a real implementation, this would:
      // 1. Call appropriate API endpoints
      // 2. Process node-specific logic
      // 3. Handle input/output transformations
      return {
        nodeId: node.id,
        status: "completed",
        outputs: {},
      };
    } catch (error) {
      return {
        nodeId: node.id,
        status: "error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },

  async executeWorkflow(workflow: Workflow): Promise<NodeExecution[]> {
    const results: NodeExecution[] = [];
    const executionOrder = this.getExecutionOrder(workflow);

    for (const nodeId of executionOrder) {
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (node) {
        const result = await this.executeNode(node);
        results.push(result);

        if (result.status === "error") {
          break;
        }
      }
    }

    return results;
  },

  getExecutionOrder(workflow: Workflow): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Get all incoming edges for this node
      const incomingEdges = workflow.edges.filter(
        (edge) => edge.target === nodeId
      );

      // Visit all dependencies first
      for (const edge of incomingEdges) {
        visit(edge.source);
      }

      order.push(nodeId);
    };

    // Start with nodes that have no incoming edges (root nodes)
    const rootNodes = workflow.nodes.filter(
      (node) => !workflow.edges.some((edge) => edge.target === node.id)
    );

    for (const node of rootNodes) {
      visit(node.id);
    }

    return order;
  },

  getNodeState(
    node: Node,
    executionResults: NodeExecution[]
  ): NodeExecutionState {
    const result = executionResults.find((r) => r.nodeId === node.id);
    if (!result) return "idle";
    if (result.status === "error") return "error";
    return result.status === "completed" ? "completed" : "executing";
  },

  validateNodeInputs(node: Node, workflow: Workflow): boolean {
    // Check if all inputs are connected (all inputs are considered required)
    const incomingEdges = workflow.edges.filter(
      (edge) => edge.target === node.id
    );
    const connectedInputs = new Set(
      incomingEdges.map((edge) => edge.targetInput)
    );

    return node.inputs.every((input) => connectedInputs.has(input.name));
  },

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
  updateNodesWithExecutionState(nodes: any[], nodeId: string, state: NodeExecutionState) {
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
  updateEdgesForNodeExecution(edges: GenericEdge[], nodeId: string, state: NodeExecutionState, connectedEdgeIds: string[]) {
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
  updateNodesWithExecutionOutputs(nodes: any[], nodeId: string, outputs: Record<string, any>) {
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
  updateNodesWithExecutionError(nodes: any[], nodeId: string, error: string | undefined) {
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
