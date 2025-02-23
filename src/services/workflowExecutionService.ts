import { Node, Graph, ExecutionResult } from '@lib/workflowTypes';
import { NodeExecutionState } from './workflowNodeService';

export const workflowExecutionService = {
  async executeNode(node: Node): Promise<ExecutionResult> {
    try {
      // This is a placeholder for actual node execution logic
      // In a real implementation, this would:
      // 1. Call appropriate API endpoints
      // 2. Process node-specific logic
      // 3. Handle input/output transformations
      return {
        nodeId: node.id,
        success: true,
        outputs: {},
      };
    } catch (error) {
      return {
        nodeId: node.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },

  async executeWorkflow(graph: Graph): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const executionOrder = this.getExecutionOrder(graph);

    for (const nodeId of executionOrder) {
      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        const result = await this.executeNode(node);
        results.push(result);

        if (!result.success) {
          break;
        }
      }
    }

    return results;
  },

  getExecutionOrder(graph: Graph): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Get all incoming edges for this node
      const incomingEdges = graph.edges.filter(edge => edge.target === nodeId);
      
      // Visit all dependencies first
      for (const edge of incomingEdges) {
        visit(edge.source);
      }

      order.push(nodeId);
    };

    // Start with nodes that have no incoming edges (root nodes)
    const rootNodes = graph.nodes.filter(node => 
      !graph.edges.some(edge => edge.target === node.id)
    );

    for (const node of rootNodes) {
      visit(node.id);
    }

    return order;
  },

  getNodeState(node: Node, executionResults: ExecutionResult[]): NodeExecutionState {
    const result = executionResults.find(r => r.nodeId === node.id);
    if (!result) return 'idle';
    if (result.error) return 'error';
    return result.success ? 'completed' : 'executing';
  },

  validateNodeInputs(node: Node, graph: Graph): boolean {
    // Check if all inputs are connected (all inputs are considered required)
    const incomingEdges = graph.edges.filter(edge => edge.target === node.id);
    const connectedInputs = new Set(incomingEdges.map(edge => edge.targetInput));
    
    return node.inputs.every(input => connectedInputs.has(input.name));
  }
}; 