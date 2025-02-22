import { Graph, ValidationError } from './types';

/**
 * Checks if there are any cycles in the graph using DFS
 */
export function detectCycles(graph: Graph): ValidationError | null {
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (stack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    stack.add(nodeId);

    const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (dfs(edge.target)) return true;
    }

    stack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id) && dfs(node.id)) {
      return { type: 'CYCLE_DETECTED', message: 'Cycle detected in workflow' };
    }
  }

  return null;
}

/**
 * Validates type compatibility between connected parameters
 */
export function validateTypeCompatibility(graph: Graph): ValidationError | null {
  for (const edge of graph.edges) {
    const sourceNode = graph.nodes.find(n => n.id === edge.source);
    const targetNode = graph.nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      return { 
        type: 'INVALID_CONNECTION',
        message: 'Connection references non-existent node',
        details: { connectionSource: edge.source, connectionTarget: edge.target }
      };
    }

    const sourceOutput = sourceNode.data.outputs?.[edge.sourceOutput];
    const targetInput = targetNode.data.inputs?.[edge.targetInput];

    if (!sourceOutput || !targetInput) {
      return {
        type: 'INVALID_CONNECTION',
        message: 'Connection references non-existent parameter',
        details: { nodeId: !sourceOutput ? sourceNode.id : targetNode.id }
      };
    }

    if (sourceOutput.type !== targetInput.type) {
      return {
        type: 'TYPE_MISMATCH',
        message: `Type mismatch: ${sourceOutput.type} -> ${targetInput.type}`,
        details: { connectionSource: edge.source, connectionTarget: edge.target }
      };
    }
  }

  return null;
}

/**
 * Validates the entire workflow graph
 */
export function validateWorkflow(graph: Graph): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check for duplicate connections
  const connections = new Set<string>();
  for (const edge of graph.edges) {
    const key = `${edge.source}:${edge.sourceOutput}->${edge.target}:${edge.targetInput}`;
    if (connections.has(key)) {
      errors.push({
        type: 'DUPLICATE_CONNECTION',
        message: 'Duplicate connection detected',
        details: { connectionSource: edge.source, connectionTarget: edge.target }
      });
    }
    connections.add(key);
  }

  // Add other validation results if they exist
  const cycleError = detectCycles(graph);
  const typeError = validateTypeCompatibility(graph);
  
  if (cycleError) errors.push(cycleError);
  if (typeError) errors.push(typeError);

  return errors;
} 