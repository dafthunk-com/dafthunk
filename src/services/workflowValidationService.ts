import { Graph } from '@/lib/workflowTypes';
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';

export const workflowValidationService = {
  validateWorkflow(graph: Graph): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate nodes
    graph.nodes.forEach(node => {
      if (!node.id || !node.name) {
        errors.push(`Node ${node.id || 'unknown'} is missing required properties`);
      }
    });

    // Validate edges
    graph.edges.forEach(edge => {
      const sourceNode = graph.nodes.find(n => n.id === edge.source);
      const targetNode = graph.nodes.find(n => n.id === edge.target);

      if (!sourceNode) {
        errors.push(`Edge source node ${edge.source} not found`);
      }
      if (!targetNode) {
        errors.push(`Edge target node ${edge.target} not found`);
      }
    });

    // Validate for cycles
    if (this.hasCycles(graph)) {
      errors.push('Workflow contains cycles');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  hasCycles(graph: Graph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCyclesDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = graph.edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (hasCyclesDFS(edge.target)) {
            return true;
          }
        } else if (recursionStack.has(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        if (hasCyclesDFS(node.id)) {
          return true;
        }
      }
    }

    return false;
  },

  validateNodeTypes(nodes: ReactFlowNode[]): boolean {
    return nodes.every(node => node.type === 'workflowNode');
  },

  validateEdgeTypes(edges: ReactFlowEdge[]): boolean {
    return edges.every(edge => edge.type === 'workflowEdge');
  }
}; 