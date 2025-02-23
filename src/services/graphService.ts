import { Graph } from '../../lib/workflowTypes';

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