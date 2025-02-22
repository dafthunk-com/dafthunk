import { Graph, Node, Edge } from '@/lib/types';

// Validate node structure
export const isValidNode = (node: unknown): node is Node => {
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
export const isValidEdge = (edge: unknown): edge is Edge => {
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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const graphService = {
  // Load a graph by ID
  async load(id: string): Promise<Graph> {
    const response = await fetch(`${API_BASE_URL}/graphs/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load graph: ${response.statusText}`);
    }

    return response.json();
  },

  // Save a graph
  async save(id: string, graph: Graph): Promise<Graph> {
    const response = await fetch(`${API_BASE_URL}/graphs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graph),
    });

    if (!response.ok) {
      throw new Error(`Failed to save graph: ${response.statusText}`);
    }

    return response.json();
  }
}; 