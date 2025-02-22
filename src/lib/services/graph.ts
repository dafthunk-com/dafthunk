import { Graph, Node, Edge } from '@/lib/types';

// Validate node structure
const isValidNode = (node: unknown): node is Node => {
  return (
    node !== null &&
    typeof node === 'object' &&
    'id' in node &&
    'name' in node &&
    'type' in node &&
    'inputs' in node &&
    'outputs' in node &&
    'position' in node &&
    node.position !== null &&
    typeof node.position === 'object' &&
    'x' in node.position &&
    'y' in node.position &&
    typeof node.position.x === 'number' &&
    typeof node.position.y === 'number'
  );
};

// Validate edge structure
const isValidEdge = (edge: unknown): edge is Edge => {
  return (
    edge !== null &&
    typeof edge === 'object' &&
    'source' in edge &&
    'target' in edge &&
    'sourceOutput' in edge &&
    'targetInput' in edge &&
    typeof edge.source === 'string' &&
    typeof edge.target === 'string' &&
    typeof edge.sourceOutput === 'string' &&
    typeof edge.targetInput === 'string'
  );
};

export const graphService = {
  // Load a graph by ID
  async load(id: string): Promise<Graph> {
    const response = await fetch(`/api/graphs/${id}`);
    if (!response.ok) {
      throw new Error(
        `Failed to load graph: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    
    // Validate and filter nodes and connections
    const validNodes = Array.isArray(data.nodes) 
      ? data.nodes.filter(isValidNode)
      : [];
    
    // Check both connections and edges fields since the API might use either
    const connections = data.connections || data.edges || [];
    const validConnections = Array.isArray(connections)
      ? connections.filter(isValidEdge)
      : [];

    return {
      id: data.id || id,
      name: data.name || 'Untitled Workflow',
      nodes: validNodes,
      edges: validConnections,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  },

  // Save a graph
  async save(id: string, graph: Graph): Promise<void> {
    const response = await fetch(`/api/graphs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nodes: graph.nodes,
        edges: graph.edges,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save graph: ${response.status} ${response.statusText}`);
    }
  }
}; 