import { Graph, Node, Edge, ValidationError } from './types';

/**
 * Checks if there are any cycles in the graph using DFS
 */
export function detectCycles(graph: Graph): ValidationError | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingConnections = graph.connections.filter(conn => conn.source === nodeId);
    for (const connection of outgoingConnections) {
      if (!visited.has(connection.target)) {
        if (dfs(connection.target)) {
          return true;
        }
      } else if (recursionStack.has(connection.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return {
          type: 'CYCLE_DETECTED',
          message: 'Cycle detected in workflow graph',
          details: { nodeId: node.id }
        };
      }
    }
  }

  return null;
}

/**
 * Validates type compatibility between connected parameters
 */
export function validateTypeCompatibility(graph: Graph): ValidationError | null {
  for (const connection of graph.connections) {
    const sourceNode = graph.nodes.find(n => n.id === connection.source);
    const targetNode = graph.nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) {
      return {
        type: 'INVALID_CONNECTION',
        message: 'Invalid node reference in connection',
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target
        }
      };
    }

    const sourceParam = sourceNode.outputs.find(o => o.name === connection.sourceOutput);
    const targetParam = targetNode.inputs.find(i => i.name === connection.targetInput);

    if (!sourceParam || !targetParam) {
      return {
        type: 'INVALID_CONNECTION',
        message: 'Invalid parameter reference in connection',
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target
        }
      };
    }

    if (sourceParam.type !== targetParam.type) {
      return {
        type: 'TYPE_MISMATCH',
        message: `Type mismatch: ${sourceParam.type} -> ${targetParam.type}`,
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target
        }
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

  // Check for cycles
  const cycleError = detectCycles(graph);
  if (cycleError) {
    errors.push(cycleError);
  }

  // Check type compatibility
  const typeError = validateTypeCompatibility(graph);
  if (typeError) {
    errors.push(typeError);
  }

  // Check for duplicate connections
  const connections = new Set<string>();
  for (const connection of graph.connections) {
    const connectionKey = `${connection.source}:${connection.sourceOutput}->${connection.target}:${connection.targetInput}`;
    if (connections.has(connectionKey)) {
      errors.push({
        type: 'DUPLICATE_CONNECTION',
        message: 'Duplicate connection detected',
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target
        }
      });
    }
    connections.add(connectionKey);
  }

  return errors;
} 