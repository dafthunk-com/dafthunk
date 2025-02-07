import { Circuit, Edge, Node, Port } from "./types";

/**
 * Checks if two ports are type compatible
 */
export function arePortsCompatible(source: Port, target: Port): boolean {
  return source.type === target.type;
}

/**
 * Finds a port in a node by name
 */
export function findPort(ports: Port[], name: string): Port | undefined {
  return ports.find((port: Port) => port.name === name);
}

/**
 * Validates if an edge connection is valid
 */
export function isValidConnection(edge: Edge, sourceNode: Node, targetNode: Node): boolean {
  const sourcePort = findPort(sourceNode.outputs, edge.sourceOutput);
  const targetPort = findPort(targetNode.inputs, edge.targetInput);

  if (!sourcePort || !targetPort) {
    return false;
  }

  return arePortsCompatible(sourcePort, targetPort);
}

/**
 * Detects if adding an edge would create a cycle in the graph
 */
export function wouldCreateCycle(circuit: Circuit, newEdge: Edge): boolean {
  const visited = new Set<string>();
  const stack = new Set<string>();

  function hasPath(current: string, target: string): boolean {
    if (current === target) return true;
    if (stack.has(current)) return false;
    if (visited.has(current)) return false;

    visited.add(current);
    stack.add(current);

    const outgoingEdges = circuit.edges.filter((edge: Edge) => edge.source === current);
    for (const edge of outgoingEdges) {
      if (hasPath(edge.target, target)) {
        return true;
      }
    }

    stack.delete(current);
    return false;
  }

  return hasPath(newEdge.target, newEdge.source);
}

/**
 * Validates an entire circuit
 */
export function validateCircuit(circuit: Circuit): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of circuit.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  // Check for duplicate edge IDs
  const edgeIds = new Set<string>();
  for (const edge of circuit.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge ID: ${edge.id}`);
    }
    edgeIds.add(edge.id);
  }

  // Validate edges
  for (const edge of circuit.edges) {
    const sourceNode = circuit.nodes.find((n: Node) => n.id === edge.source);
    const targetNode = circuit.nodes.find((n: Node) => n.id === edge.target);

    if (!sourceNode) {
      errors.push(`Edge ${edge.id} references non-existent source node ${edge.source}`);
      continue;
    }

    if (!targetNode) {
      errors.push(`Edge ${edge.id} references non-existent target node ${edge.target}`);
      continue;
    }

    if (!isValidConnection(edge, sourceNode, targetNode)) {
      errors.push(`Invalid connection in edge ${edge.id}`);
    }
  }

  // Check for cycles
  for (const edge of circuit.edges) {
    if (wouldCreateCycle({ ...circuit, edges: circuit.edges.filter((e: Edge) => e.id !== edge.id) }, edge)) {
      errors.push(`Circuit contains a cycle involving edge ${edge.id}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
} 